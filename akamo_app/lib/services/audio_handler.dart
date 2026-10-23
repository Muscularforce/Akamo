import 'dart:async';

import 'package:audio_service/audio_service.dart';
import 'package:flutter/foundation.dart';
import 'package:just_audio/just_audio.dart';

import '../core/models/track_model.dart';

/// Initializes the global [AudioService] singleton for the app.
Future<AkamoAudioHandler> initAudioService() async {
  try {
    return await AudioService.init(
      builder: () => AkamoAudioHandler(),
      config: const AudioServiceConfig(
        androidNotificationChannelId: 'com.akamo.app.audio',
        androidNotificationChannelName: 'Akamo Music Playback',
        androidNotificationChannelDescription:
            'Background audio playback for Akamo music synthesizer',
        androidNotificationOngoing: true,
        androidStopForegroundOnPause: true,
        androidShowNotificationBadge: true,
        androidNotificationClickStartsActivity: true,
      ),
    );
  } catch (e) {
    debugPrint('[AudioService] Fallback init: $e');
    return AkamoAudioHandler();
  }
}

/// Production Audio Service Handler connecting [AudioService] with [AudioPlayer].
class AkamoAudioHandler extends BaseAudioHandler
    with QueueHandler, SeekHandler {
  final AudioPlayer _player = AudioPlayer();

  // Internal cache of active track models
  final List<TrackModel> _currentTracks = [];

  AkamoAudioHandler() {
    _initAudioPipeline();
  }

  void _initAudioPipeline() {
    // 1. Listen for playback events (playing, processing state, buffered position, position)
    _player.playbackEventStream.listen(
      _broadcastPlaybackState,
      onError: (Object e, StackTrace st) {
        debugPrint('[AkamoAudioHandler] PlaybackEvent error: $e');
      },
    );

    // 2. Listen for duration changes on current track
    _player.durationStream.listen((Duration? duration) {
      final int? index = _player.currentIndex;
      final List<MediaItem> currentQueue = queue.value;
      if (index == null ||
          currentQueue.isEmpty ||
          index >= currentQueue.length) {
        return;
      }

      final MediaItem oldItem = currentQueue[index];
      final MediaItem updatedItem = oldItem.copyWith(duration: duration);

      final updatedQueue = List<MediaItem>.from(currentQueue);
      updatedQueue[index] = updatedItem;
      queue.add(updatedQueue);
      mediaItem.add(updatedItem);
    });

    // 3. Listen for sequence and active index transitions
    _player.sequenceStateStream.listen((SequenceState? sequenceState) {
      final List<IndexedAudioSource>? sequence =
          sequenceState?.effectiveSequence;
      if (sequence == null || sequence.isEmpty) return;

      final List<MediaItem> items = sequence
          .map((source) => source.tag as MediaItem)
          .toList();
      queue.add(items);

      final int? currentIndex = sequenceState?.currentIndex;
      if (currentIndex != null && currentIndex < items.length) {
        mediaItem.add(items[currentIndex]);
      }
    });

    // 4. Handle track completion -> auto advance if single track ended
    _player.playerStateStream.listen((PlayerState state) {
      if (state.processingState == ProcessingState.completed) {
        if (_player.hasNext) {
          skipToNext();
        } else {
          pause();
          seek(Duration.zero);
        }
      }
    });
  }

  void _broadcastPlaybackState(PlaybackEvent event) {
    final bool playing = _player.playing;
    final ProcessingState state = _player.processingState;

    final AudioProcessingState audioProcessingState = switch (state) {
      ProcessingState.idle => AudioProcessingState.idle,
      ProcessingState.loading => AudioProcessingState.loading,
      ProcessingState.buffering => AudioProcessingState.buffering,
      ProcessingState.ready => AudioProcessingState.ready,
      ProcessingState.completed => AudioProcessingState.completed,
    };

    playbackState.add(
      playbackState.value.copyWith(
        controls: [
          MediaControl.skipToPrevious,
          if (playing) MediaControl.pause else MediaControl.play,
          MediaControl.stop,
          MediaControl.skipToNext,
        ],
        systemActions: const {
          MediaAction.seek,
          MediaAction.seekForward,
          MediaAction.seekBackward,
          MediaAction.skipToNext,
          MediaAction.skipToPrevious,
        },
        androidCompactActionIndices: const [0, 1, 3],
        processingState: audioProcessingState,
        playing: playing,
        updatePosition: _player.position,
        bufferedPosition: _player.bufferedPosition,
        speed: _player.speed,
        queueIndex: event.currentIndex,
      ),
    );
  }

  /// Loads and starts playback of a track playlist.
  Future<void> loadPlaylist(
    List<TrackModel> tracks, {
    int initialIndex = 0,
  }) async {
    if (tracks.isEmpty) return;

    _currentTracks.clear();
    _currentTracks.addAll(tracks);

    final List<AudioSource> audioSources = [];
    final List<MediaItem> playableItems = [];
    for (final track in tracks) {
      if (track.audioUrl.isNotEmpty) {
        final item = MediaItem(
          id: track.id,
          album: track.album.isNotEmpty ? track.album : 'Akamo Singles',
          title: track.title.isNotEmpty ? track.title : 'Untitled Signal',
          artist: track.artist.isNotEmpty ? track.artist : 'Unknown Artist',
          artUri: track.coverUrl.isNotEmpty
              ? Uri.tryParse(track.coverUrl)
              : null,
          duration: track.duration > 0
              ? Duration(seconds: track.duration)
              : null,
          extras: <String, dynamic>{'audioUrl': track.audioUrl},
        );
        playableItems.add(item);
        audioSources.add(AudioSource.uri(Uri.parse(track.audioUrl), tag: item));
      }
    }

    if (audioSources.isEmpty) {
      debugPrint('[AkamoAudioHandler] No playable audio URLs in playlist.');
      return;
    }

    try {
      final safeIndex = initialIndex.clamp(0, audioSources.length - 1).toInt();

      queue.add(playableItems);
      mediaItem.add(playableItems[safeIndex]);

      await _player.setAudioSources(
        audioSources,
        initialIndex: safeIndex,
        initialPosition: Duration.zero,
      );

      await play();
    } catch (e, st) {
      debugPrint('[AkamoAudioHandler] Error loading playlist: $e\n$st');
      playbackState.add(
        playbackState.value.copyWith(
          processingState: AudioProcessingState.error,
          errorMessage: 'Failed to stream audio signal',
        ),
      );
    }
  }

  /// Plays an individual track immediately.
  Future<void> playTrack(TrackModel track) async {
    await loadPlaylist([track], initialIndex: 0);
  }

  @override
  Future<void> play() async {
    try {
      await _player.play();
    } catch (e) {
      debugPrint('[AkamoAudioHandler] play() error: $e');
    }
  }

  @override
  Future<void> pause() async {
    try {
      await _player.pause();
    } catch (e) {
      debugPrint('[AkamoAudioHandler] pause() error: $e');
    }
  }

  @override
  Future<void> seek(Duration position) => _player.seek(position);

  @override
  Future<void> skipToQueueItem(int index) async {
    if (index < 0 || index >= queue.value.length) return;
    await _player.seek(Duration.zero, index: index);
    if (!_player.playing) {
      await play();
    }
  }

  @override
  Future<void> skipToNext() async {
    if (_player.hasNext) {
      await _player.seekToNext();
      if (!_player.playing) await play();
    }
  }

  @override
  Future<void> skipToPrevious() async {
    if (_player.position.inSeconds > 3) {
      await _player.seek(Duration.zero);
    } else if (_player.hasPrevious) {
      await _player.seekToPrevious();
      if (!_player.playing) await play();
    } else {
      await _player.seek(Duration.zero);
    }
  }

  @override
  Future<void> stop() async {
    await _player.stop();
    await super.stop();
  }

  /// Releases audio resources on app termination.
  Future<void> dispose() async {
    await _player.dispose();
  }
}
