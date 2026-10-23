import 'package:audio_service/audio_service.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/akamo_tokens.dart';
import '../../core/widgets/akamo_glass.dart';
import '../../services/audio_handler.dart';

class ModernPlayerView extends StatelessWidget {
  const ModernPlayerView({super.key});

  @override
  Widget build(BuildContext context) {
    final audioHandler = Provider.of<AkamoAudioHandler>(context, listen: false);

    return StreamBuilder<MediaItem?>(
      stream: audioHandler.mediaItem,
      builder: (context, mediaSnapshot) {
        final mediaItem = mediaSnapshot.data;
        if (mediaItem == null) return const SizedBox.shrink();

        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          child: AkamoGlass(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            radius: AkamoRadii.panel,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: AkamoColors.obsidian,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AkamoColors.glassStroke),
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: mediaItem.artUri != null
                          ? Image.network(
                              mediaItem.artUri!.toString(),
                              fit: BoxFit.cover,
                            )
                          : const Icon(
                              Icons.music_note,
                              color: AkamoColors.titaniumMuted,
                            ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            mediaItem.title,
                            style: const TextStyle(
                              color: AkamoColors.titanium,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            mediaItem.artist ?? 'Unknown Artist',
                            style: const TextStyle(
                              color: AkamoColors.titaniumMuted,
                              fontSize: 12,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    _TransportControls(audioHandler: audioHandler),
                  ],
                ),
                StreamBuilder<PlaybackState>(
                  stream: audioHandler.playbackState,
                  builder: (context, playbackSnapshot) {
                    final position =
                        playbackSnapshot.data?.position ?? Duration.zero;
                    final duration = mediaItem.duration ?? Duration.zero;
                    if (duration.inMilliseconds == 0) {
                      return const SizedBox.shrink();
                    }
                    return Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Row(
                        children: [
                          Text(
                            _formatDuration(position),
                            style: const TextStyle(
                              color: AkamoColors.titaniumMuted,
                              fontSize: 10,
                            ),
                          ),
                          Expanded(
                            child: SliderTheme(
                              data: SliderThemeData(
                                trackHeight: 4,
                                thumbShape: const RoundSliderThumbShape(
                                  enabledThumbRadius: 6,
                                ),
                                overlayShape: const RoundSliderOverlayShape(
                                  overlayRadius: 12,
                                ),
                                activeTrackColor: AkamoColors.acid,
                                inactiveTrackColor: AkamoColors.graphite,
                                thumbColor: AkamoColors.titanium,
                              ),
                              child: Slider(
                                value: position.inMilliseconds
                                    .toDouble()
                                    .clamp(
                                      0.0,
                                      duration.inMilliseconds.toDouble(),
                                    ),
                                max: duration.inMilliseconds.toDouble(),
                                onChanged: (value) {
                                  audioHandler.seek(
                                    Duration(milliseconds: value.toInt()),
                                  );
                                },
                              ),
                            ),
                          ),
                          Text(
                            _formatDuration(duration),
                            style: const TextStyle(
                              color: AkamoColors.titaniumMuted,
                              fontSize: 10,
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    String twoDigitMinutes = twoDigits(duration.inMinutes.remainder(60));
    String twoDigitSeconds = twoDigits(duration.inSeconds.remainder(60));
    if (duration.inHours > 0) {
      return '${duration.inHours}:$twoDigitMinutes:$twoDigitSeconds';
    }
    return '$twoDigitMinutes:$twoDigitSeconds';
  }
}

class _TransportControls extends StatelessWidget {
  const _TransportControls({required this.audioHandler});

  final AkamoAudioHandler audioHandler;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<PlaybackState>(
      stream: audioHandler.playbackState,
      builder: (context, playbackSnapshot) {
        final pbs = playbackSnapshot.data;
        final playing = pbs?.playing ?? false;
        final processing = pbs?.processingState;
        final isLoading = processing == AudioProcessingState.loading ||
            processing == AudioProcessingState.buffering;

        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(
                Icons.skip_previous,
                color: AkamoColors.titanium,
                size: 28,
              ),
              onPressed: audioHandler.skipToPrevious,
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
            const SizedBox(width: 16),
            AkamoTactile(
              onTap: () {
                playing ? audioHandler.pause() : audioHandler.play();
              },
              scale: 0.92,
              child: Container(
                width: 40,
                height: 40,
                decoration: const BoxDecoration(
                  color: AkamoColors.acid,
                  shape: BoxShape.circle,
                ),
                child: isLoading
                    ? const Padding(
                        padding: EdgeInsets.all(10.0),
                        child: CircularProgressIndicator(
                          color: AkamoColors.obsidian,
                          strokeWidth: 2,
                        ),
                      )
                    : const Icon(
                        Icons.play_arrow_rounded,
                        color: AkamoColors.obsidian,
                        size: 24,
                      ),
              ),
            ),
            const SizedBox(width: 16),
            IconButton(
              icon: const Icon(
                Icons.skip_next,
                color: AkamoColors.titanium,
                size: 28,
              ),
              onPressed: audioHandler.skipToNext,
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
          ],
        );
      },
    );
  }
}
