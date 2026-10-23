import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/models/track_model.dart';
import '../../core/theme/akamo_tokens.dart';
import '../../core/widgets/akamo_glass.dart';
import '../../services/audio_handler.dart';
import '../../services/supabase_service.dart';

/// Explore — the global charts rail. Ranks newly uploaded signals and opens
/// full playback from its chart list. Fully on Akamo design tokens.
class ExploreView extends StatefulWidget {
  const ExploreView({super.key});

  @override
  State<ExploreView> createState() => _ExploreViewState();
}

class _ExploreViewState extends State<ExploreView> {
  final _supabaseService = SupabaseService();
  List<TrackModel> _topTracks = [];
  bool _isLoading = true;

  static const _categories = <(String, Color, Color)>[
    ('Pop', AkamoColors.ember, AkamoColors.ultraviolet),
    ('Hip-Hop', AkamoColors.ultraviolet, AkamoColors.cyan),
    ('Lo-Fi', AkamoColors.cyan, AkamoColors.acid),
    ('Rock', AkamoColors.acid, AkamoColors.ember),
    ('Jazz', AkamoColors.titaniumMuted, AkamoColors.smoke),
    ('Electronic', AkamoColors.cyan, AkamoColors.ultraviolet),
  ];

  @override
  void initState() {
    super.initState();
    _loadCharts();
  }

  Future<void> _loadCharts() async {
    try {
      final tracks = await _supabaseService
          .fetchTracks()
          .timeout(const Duration(seconds: 15));
      if (!mounted) return;
      setState(() {
        _topTracks = tracks.take(10).toList();
        _isLoading = false;
      });
    } on TimeoutException {
      if (!mounted) return;
      setState(() => _isLoading = false);
    } catch (e) {
      debugPrint('Error loading charts: $e');
      if (!mounted) return;
      setState(() => _isLoading = false);
    }
  }

  void _playTrack(int index) {
    final handler = Provider.of<AkamoAudioHandler>(context, listen: false);
    handler.loadPlaylist(_topTracks, initialIndex: index);
  }

  @override
  Widget build(BuildContext context) {
    final topPadding = MediaQuery.paddingOf(context).top;

    return RefreshIndicator.adaptive(
      edgeOffset: topPadding + 14,
      color: AkamoColors.obsidian,
      backgroundColor: AkamoColors.acid,
      onRefresh: _loadCharts,
      child: SafeArea(
        bottom: false,
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(
            parent: AlwaysScrollableScrollPhysics(),
          ),
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.fromLTRB(
                  AkamoSpacing.page,
                  topPadding + 14,
                  AkamoSpacing.page,
                  0,
                ),
                child: Text(
                  'Browse all',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(
                AkamoSpacing.page,
                24,
                AkamoSpacing.page,
                0,
              ),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 14,
                  mainAxisSpacing: 14,
                  childAspectRatio: 1.6,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final cat = _categories[index];
                    return AkamoTactile(
                      onTap: () {},
                      scale: 0.955,
                      child: Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(AkamoRadii.compact),
                          gradient: LinearGradient(
                            colors: <Color>[cat.$2, cat.$3],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          boxShadow: const <BoxShadow>[
                            BoxShadow(
                              color: Color(0x33000000),
                              blurRadius: 18,
                              offset: Offset(0, 10),
                              spreadRadius: -10,
                            ),
                          ],
                        ),
                        padding: const EdgeInsets.all(16),
                        alignment: Alignment.bottomLeft,
                        child: Text(
                          cat.$1,
                          style: Theme.of(context).textTheme.titleLarge
                              ?.copyWith(
                                fontWeight: FontWeight.w900,
                                color: AkamoColors.obsidian,
                                letterSpacing: -0.4,
                              ),
                        ),
                      ),
                    );
                  },
                  childCount: _categories.length,
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(
                  AkamoSpacing.page,
                  48,
                  AkamoSpacing.page,
                  0,
                ),
                child: Text(
                  'Global Charts',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(
                  AkamoSpacing.page,
                  16,
                  AkamoSpacing.page,
                  0,
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 120,
                        child: Center(
                          child: CircularProgressIndicator(
                            color: AkamoColors.acid,
                            strokeWidth: 2,
                          ),
                        ),
                      )
                    : _topTracks.isEmpty
                    ? const Text(
                        'No charts available',
                        style: TextStyle(color: AkamoColors.titaniumMuted),
                      )
                    : const SizedBox.shrink(),
              ),
            ),
            if (!_isLoading && _topTracks.isNotEmpty)
              SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final track = _topTracks[index];
                    return Padding(
                      padding: const EdgeInsets.fromLTRB(
                        AkamoSpacing.page,
                        0,
                        AkamoSpacing.page,
                        10,
                      ),
                      child: AkamoTactile(
                        onTap: () => _playTrack(index),
                        scale: 0.98,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 10,
                          ),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(AkamoRadii.compact),
                            color: AkamoColors.glassFillStrong.withValues(alpha: 0.62),
                            border: Border.all(color: AkamoColors.glassStroke),
                          ),
                          child: Row(
                            children: [
                              SizedBox(
                                width: 26,
                                child: Text(
                                  '${index + 1}',
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleMedium
                                      ?.copyWith(
                                        fontWeight: FontWeight.w800,
                                        color: AkamoColors.acid,
                                      ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Container(
                                width: 48,
                                height: 48,
                                clipBehavior: Clip.antiAlias,
                                decoration: BoxDecoration(
                                  color: AkamoColors.obsidian,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: AkamoColors.glassStroke,
                                  ),
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
                                  children: [
                                    Text(
                                      track.title,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 16,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      track.artist,
                                      style: const TextStyle(
                                        color: AkamoColors.titaniumMuted,
                                        fontSize: 14,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
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
                      ),
                    );
                  },
                  childCount: _topTracks.length,
                ),
              ),
            const SliverToBoxAdapter(child: SizedBox(height: 160)),
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
