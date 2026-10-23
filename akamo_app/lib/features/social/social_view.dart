import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/models/user_stat_model.dart';
import '../../core/theme/akamo_tokens.dart';
import '../../core/widgets/akamo_glass.dart';
import '../../core/widgets/avatar_image.dart';
import '../../services/supabase_service.dart';

/// Medal accents for the podium — acid takes the crown so the #1 spot reads
/// as pure Akamo brand energy.
const _medalColors = <Color>[
  AkamoColors.acid, // gold
  AkamoColors.titanium, // silver
  AkamoColors.ember, // bronze
];

const _medalLabels = <String>['#1', '#2', '#3'];

class SocialView extends StatefulWidget {
  const SocialView({super.key});

  @override
  State<SocialView> createState() => _SocialViewState();
}

class _SocialViewState extends State<SocialView> {
  final _service = SupabaseService();
  List<UserStatModel> _stats = [];
  bool _isLoading = true;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    setState(() => _hasError = false);
    try {
      final stats = await _service.fetchUserStats().timeout(
        const Duration(seconds: 15),
      );
      if (mounted) {
        setState(() {
          _stats = stats;
          _isLoading = false;
        });
      }
    } on TimeoutException {
      debugPrint('[Social] fetchUserStats timed out');
      if (mounted) setState(() => _hasError = true);
    } catch (e) {
      debugPrint('[Social] load error: $e');
      if (mounted) setState(() => _hasError = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator.adaptive(
      color: AkamoColors.obsidian,
      backgroundColor: AkamoColors.acid,
      onRefresh: _loadStats,
      child: CustomScrollView(
        physics: const BouncingScrollPhysics(
          parent: AlwaysScrollableScrollPhysics(),
        ),
        slivers: [
          SliverToBoxAdapter(
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        IconButton(
                          onPressed: () => Navigator.pop(context),
                          icon: const Icon(
                            Icons.arrow_back_rounded,
                            color: AkamoColors.titanium,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'COMMUNITY',
                      style: Theme.of(context).textTheme.labelMedium
                          ?.copyWith(color: AkamoColors.acid),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Leaderboard',
                      style: Theme.of(context).textTheme.displayMedium,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _stats.isEmpty
                          ? 'Uploads build your rank among contributors.'
                          : '${_stats.fold<int>(0, (sum, s) => sum + s.uploadCount)} total uploads across ${_stats.length} contributors',
                      style: Theme.of(context).textTheme.bodyMedium
                          ?.copyWith(color: AkamoColors.titaniumMuted),
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (_isLoading)
            const SliverToBoxAdapter(
              child: SizedBox(
                height: 320,
                child: Center(
                  child: CircularProgressIndicator(
                    color: AkamoColors.acid,
                    strokeWidth: 2,
                  ),
                ),
              ),
            )
          else if (_hasError)
            const SliverToBoxAdapter(child: _ErrorState())
          else if (_stats.isEmpty)
            const SliverToBoxAdapter(child: _EmptyState())
          else ...[
            const SliverToBoxAdapter(child: SizedBox(height: 28)),
            if (_stats.length >= 3)
              SliverToBoxAdapter(
                child: _Podium(
                  second: _stats[1],
                  first: _stats[0],
                  third: _stats[2],
                ),
              )
            else
              SliverToBoxAdapter(
                child: _Podium(
                  second: _stats.length > 1 ? _stats[1] : null,
                  first: _stats[0],
                  third: null,
                ),
              ),
            if (_stats.length > 3)
              SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) =>
                      _LeaderboardRow(stat: _stats[index + 3], rank: index + 3),
                  childCount: _stats.length - 3,
                ),
              ),
          ],
          const SliverToBoxAdapter(
            child: SizedBox(height: AkamoSpacing.dockClearance),
          ),
        ],
      ),
    );
  }
}

// ─── Podium ──────────────────────────────────────────────────────────────────

/// Staggered [2nd | 1st | 3rd] pedestal arrangement with medal-tinted avatar
/// rings and upload counts carved into each step.
class _Podium extends StatelessWidget {
  const _Podium({
    required this.first,
    required this.second,
    required this.third,
  });

  final UserStatModel first;
  final UserStatModel? second;
  final UserStatModel? third;

  static const _pedestalHeights = <double>[96, 68, 52];

  @override
  Widget build(BuildContext context) {
    Widget column(UserStatModel? stat, int place) {
      if (stat == null) return const Expanded(child: SizedBox.shrink());
      return Expanded(
        child: _PodiumColumn(
          stat: stat,
          place: place,
          pedestalHeight: _pedestalHeights[place - 1],
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          column(second, 2),
          const SizedBox(width: 12),
          column(first, 1),
          const SizedBox(width: 12),
          column(third, 3),
        ],
      ),
    );
  }
}

class _PodiumColumn extends StatelessWidget {
  const _PodiumColumn({
    required this.stat,
    required this.place,
    required this.pedestalHeight,
  });

  final UserStatModel stat;
  final int place;
  final double pedestalHeight;

  Color get _medal => _medalColors[place - 1];

  @override
  Widget build(BuildContext context) {
    final isFirst = place == 1;
    return Column(
      children: [
        AkamoAvatar(
          displayName: stat.displayName,
          avatarUrl: stat.avatarUrl,
          radius: isFirst ? 34 : 27,
          ringColor: _medal.withValues(alpha: isFirst ? 0.9 : 0.55),
        ),
        const SizedBox(height: 10),
        Text(
          stat.displayName,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          textAlign: TextAlign.center,
          style: isFirst
              ? Theme.of(context).textTheme.titleMedium
              : Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AkamoColors.titanium,
                ),
        ),
        const SizedBox(height: 2),
        Text(
          '${stat.uploadCount} ${stat.uploadCount == 1 ? 'upload' : 'uploads'}',
          style: Theme.of(context).textTheme.bodySmall
              ?.copyWith(color: AkamoColors.smoke),
        ),
        const SizedBox(height: 12),
        // Pedestal step
        Container(
          height: pedestalHeight,
          width: double.infinity,
          decoration: BoxDecoration(
            borderRadius: const BorderRadius.vertical(
              top: Radius.circular(AkamoRadii.micro),
            ),
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: <Color>[
                _medal.withValues(alpha: isFirst ? 0.30 : 0.14),
                _medal.withValues(alpha: 0.05),
              ],
            ),
            border: Border(
              top: BorderSide(color: _medal.withValues(alpha: 0.45)),
              left: BorderSide(color: _medal.withValues(alpha: 0.18)),
              right: BorderSide(color: _medal.withValues(alpha: 0.18)),
            ),
            boxShadow: isFirst
                ? <BoxShadow>[
                    BoxShadow(
                      color: _medal.withValues(alpha: 0.16),
                      blurRadius: 26,
                      spreadRadius: -6,
                    ),
                  ]
                : null,
          ),
          child: Center(
            child: Text(
              _medalLabels[place - 1],
              style: TextStyle(
                color: _medal,
                fontWeight: FontWeight.w900,
                fontSize: isFirst ? 26 : 19,
                letterSpacing: -0.5,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

// ─── Leaderboard rows ────────────────────────────────────────────────────────

class _LeaderboardRow extends StatelessWidget {
  const _LeaderboardRow({required this.stat, required this.rank});

  final UserStatModel stat;
  final int rank;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 5, 20, 5),
      child: AkamoGlass(
        radius: AkamoRadii.compact,
        tint: AkamoColors.glassFillStrong,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            SizedBox(
              width: 30,
              child: Text(
                '${rank + 1}',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: AkamoColors.smoke,
                  fontWeight: FontWeight.w800,
                ),
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(width: 13),
            AkamoAvatar(
              displayName: stat.displayName,
              avatarUrl: stat.avatarUrl,
              radius: 21,
            ),
            const SizedBox(width: 13),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          stat.displayName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.bodyLarge
                              ?.copyWith(fontWeight: FontWeight.w600),
                        ),
                      ),
                      if (stat.role == 'owner') ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: AkamoColors.acid.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(
                              AkamoRadii.pill,
                            ),
                            border: Border.all(
                              color: AkamoColors.acid.withValues(alpha: 0.35),
                            ),
                          ),
                          child: const Text(
                            'AURORA',
                            style: TextStyle(
                              color: AkamoColors.acid,
                              fontSize: 8,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 1,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${stat.uploadCount} ${stat.uploadCount == 1 ? 'upload' : 'uploads'}',
                    style: Theme.of(context).textTheme.bodySmall
                        ?.copyWith(color: AkamoColors.titaniumMuted),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.graphic_eq_rounded,
              size: 17,
              color: AkamoColors.smoke.withValues(alpha: 0.65),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── States ──────────────────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 56),
      child: Center(
        child: Column(
          children: [
            Container(
              width: 76,
              height: 76,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AkamoColors.glassFillStrong,
                border: Border.all(color: AkamoColors.glassStroke),
              ),
              child: const Icon(
                Icons.emoji_events_outlined,
                color: AkamoColors.smoke,
                size: 34,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'The podium is waiting.',
              style: Theme.of(context).textTheme.titleMedium
                  ?.copyWith(color: AkamoColors.titanium),
            ),
            const SizedBox(height: 6),
            Text(
              'Upload your first track to appear here.',
              style: Theme.of(context).textTheme.bodySmall
                  ?.copyWith(color: AkamoColors.smoke),
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 56),
      child: Center(
        child: Column(
          children: [
            const Icon(
              Icons.wifi_off_rounded,
              color: AkamoColors.smoke,
              size: 44,
            ),
            const SizedBox(height: 14),
            Text(
              'Could not reach the leaderboard.\nPull down to retry.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium
                  ?.copyWith(color: AkamoColors.titaniumMuted),
            ),
          ],
        ),
      ),
    );
  }
}
