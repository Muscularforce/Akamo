import 'dart:async';
import 'dart:ui';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../core/models/track_model.dart';
import '../../core/theme/akamo_tokens.dart';
import '../../core/widgets/akamo_glass.dart';
import '../../services/audio_handler.dart';

/// Pushes a full-screen liquid-glass search overlay. Debounced query
/// filtering runs across track titles, artists and albums; taps play the
/// matching track within its filtered result queue.
Future<void> showSearchOverlay(
  BuildContext context,
  List<TrackModel> allTracks,
) {
  return Navigator.of(context, rootNavigator: true).push<void>(
    MaterialPageRoute<void>(
      fullscreenDialog: true,
      builder: (_) => SearchOverlay(allTracks: allTracks),
    ),
  );
}

class SearchOverlay extends StatefulWidget {
  const SearchOverlay({super.key, required this.allTracks});

  final List<TrackModel> allTracks;

  @override
  State<SearchOverlay> createState() => _SearchOverlayState();
}

class _SearchOverlayState extends State<SearchOverlay> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  Timer? _debounce;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _focusNode.requestFocus();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    setState(() {});
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      if (mounted) setState(() => _query = value.trim());
    });
  }

  List<TrackModel> get _results {
    if (_query.isEmpty) return widget.allTracks;
    final q = _query.toLowerCase();
    return widget.allTracks
        .where(
          (t) =>
              t.title.toLowerCase().contains(q) ||
              t.artist.toLowerCase().contains(q) ||
              t.album.toLowerCase().contains(q),
        )
        .take(60)
        .toList();
  }

  void _playTrack(int index) {
    final queue = _results;
    if (queue.isEmpty) return;
    final handler = Provider.of<AkamoAudioHandler>(context, listen: false);
    handler.loadPlaylist(queue, initialIndex: index);
  }

  @override
  Widget build(BuildContext context) {
    final results = _results;

    return Scaffold(
      backgroundColor: AkamoColors.obsidian.withValues(alpha: 0.94),
      body: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
        child: SafeArea(
          child: Column(
            children: <Widget>[
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  AkamoSpacing.page,
                  12,
                  AkamoSpacing.page,
                  0,
                ),
                child: Row(
                  children: <Widget>[
                    AkamoTactile(
                      onTap: () => Navigator.of(context).pop(),
                      scale: 0.9,
                      child: Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AkamoColors.glassFillStrong,
                          border: Border.all(color: AkamoColors.glassStroke),
                        ),
                        child: const Icon(
                          Icons.close_rounded,
                          color: AkamoColors.titanium,
                          size: 20,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: AkamoGlass(
                        radius: AkamoRadii.compact,
                        blur: 12,
                        tint: AkamoColors.glassFillStrong,
                        borderColor: AkamoColors.glassHighlight.withValues(
                          alpha: 0.4,
                        ),
                        child: TextField(
                          controller: _controller,
                          focusNode: _focusNode,
                          autofocus: true,
                          onChanged: _onChanged,
                          style: const TextStyle(
                            color: AkamoColors.titanium,
                            fontSize: 16,
                          ),
                          cursorColor: AkamoColors.acid,
                          inputFormatters: <TextInputFormatter>[
                            LengthLimitingTextInputFormatter(80),
                          ],
                          decoration: InputDecoration(
                            hintText: 'Search the signal',
                            hintStyle: const TextStyle(
                              color: AkamoColors.titaniumMuted,
                            ),
                            prefixIcon: const Icon(
                              Icons.search_rounded,
                              color: AkamoColors.titaniumMuted,
                            ),
                            suffixIcon: _controller.text.isEmpty
                                ? null
                                : IconButton(
                                    icon: const Icon(
                                      Icons.clear_rounded,
                                      color: AkamoColors.titaniumMuted,
                                    ),
                                    onPressed: () {
                                      _controller.clear();
                                      _onChanged('');
                                    },
                                  ),
                            border: InputBorder.none,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: results.isEmpty
                    ? const _EmptySearch()
                    : ListView.separated(
                        physics: const BouncingScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(
                          AkamoSpacing.page,
                          8,
                          AkamoSpacing.page,
                          AkamoSpacing.dockClearance,
                        ),
                        itemCount: results.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 4),
                        itemBuilder: (context, index) {
                          final track = results[index];
                          return _SearchResultTile(
                            track: track,
                            index: index,
                            onTap: () => _playTrack(index),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SearchResultTile extends StatelessWidget {
  const _SearchResultTile({
    required this.track,
    required this.index,
    required this.onTap,
  });

  final TrackModel track;
  final int index;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return AkamoTactile(
      onTap: onTap,
      scale: 0.98,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 5),
        child: Row(
          children: <Widget>[
            Container(
              width: 48,
              height: 48,
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(10),
                color: AkamoColors.obsidian,
                border: Border.all(color: AkamoColors.glassStroke),
              ),
              child: track.coverUrl.isNotEmpty
                  ? _GlassCoverImage(
                      url: track.coverUrl,
                      seedTitle: track.title,
                      memCacheWidth: 120,
                    )
                  : const Icon(
                      Icons.music_note_rounded,
                      color: AkamoColors.titaniumMuted,
                      size: 20,
                    ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    track.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${track.artist} • ${track.album.isEmpty ? 'Single' : track.album}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AkamoColors.titaniumMuted,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.play_arrow_rounded,
              color: AkamoColors.acid,
              size: 24,
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptySearch extends StatelessWidget {
  const _EmptySearch();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(
              Icons.radar_rounded,
              color: AkamoColors.titaniumMuted,
              size: 46,
            ),
            SizedBox(height: 16),
            Text(
              'No frequencies match that signal.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AkamoColors.titaniumMuted),
            ),
          ],
        ),
      ),
    );
  }
}

class _GlassCoverImage extends StatelessWidget {
  const _GlassCoverImage({
    required this.url,
    required this.seedTitle,
    this.memCacheWidth,
  });

  final String url;
  final String seedTitle;
  final int? memCacheWidth;

  @override
  Widget build(BuildContext context) {
    return CachedNetworkImage(
      imageUrl: url,
      fit: BoxFit.cover,
      memCacheWidth: memCacheWidth ?? 440,
      fadeInDuration: const Duration(milliseconds: 260),
      placeholder: (_, _) => const _CoverShimmer(),
      errorWidget: (_, _, _) => _GradientPlaceholder(seed: seedTitle.hashCode),
    );
  }
}

class _CoverShimmer extends StatefulWidget {
  const _CoverShimmer();

  @override
  State<_CoverShimmer> createState() => _CoverShimmerState();
}

class _CoverShimmerState extends State<_CoverShimmer>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: <Widget>[
        const ColoredBox(color: AkamoColors.glassFillStrong),
        const Center(
          child: Icon(Icons.album_rounded, color: Colors.white10, size: 30),
        ),
        AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            final progress = Curves.easeInOutSine.transform(_controller.value);
            return Align(
              alignment: Alignment(-1.8 + 3.6 * progress, 0),
              child: Transform.rotate(
                angle: 0.32,
                child: Container(
                  width: 72,
                  height: double.infinity,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.centerLeft,
                      end: Alignment.centerRight,
                      colors: <Color>[
                        Colors.white.withValues(alpha: 0.0),
                        Colors.white.withValues(alpha: 0.07),
                        Colors.white.withValues(alpha: 0.0),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}

class _GradientPlaceholder extends StatelessWidget {
  const _GradientPlaceholder({required this.seed});

  final int seed;

  @override
  Widget build(BuildContext context) {
    final colors = <List<Color>>[
      <Color>[AkamoColors.ultraviolet, AkamoColors.cyan],
      <Color>[AkamoColors.ember, AkamoColors.ultraviolet],
      <Color>[AkamoColors.cyan, AkamoColors.acid],
      <Color>[AkamoColors.acid, AkamoColors.ember],
    ];
    final pair = colors[seed.abs() % colors.length];
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: <Color>[
            pair[0].withValues(alpha: 0.85),
            pair[1].withValues(alpha: 0.65),
            AkamoColors.obsidian,
          ],
        ),
      ),
      child: const Center(
        child: Icon(Icons.album_rounded, color: Colors.white24, size: 36),
      ),
    );
  }
}
