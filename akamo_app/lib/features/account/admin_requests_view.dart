import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/models/song_request_model.dart';
import '../../core/theme/akamo_tokens.dart';
import '../../core/widgets/akamo_glass.dart';
import '../../services/supabase_service.dart';

/// Owner-only moderation surface for listener song requests.
/// Non-owner sessions are stopped at a hard in-app access guard.
class AdminRequestsView extends StatefulWidget {
  const AdminRequestsView({super.key});

  @override
  State<AdminRequestsView> createState() => _AdminRequestsViewState();
}

class _AdminRequestsViewState extends State<AdminRequestsView> {
  final _service = SupabaseService();

  bool _isCheckingAccess = true;
  bool _hasAccess = false;
  bool _accessCheckFailed = false;
  List<SongRequestModel> _pending = [];
  List<SongRequestModel> _resolved = [];
  bool _isLoading = true;
  String? _loadError;

  /// IDs of requests mid-status-update so only their controls spin.
  final Set<String> _busyIds = <String>{};

  @override
  void initState() {
    super.initState();
    _verifyAccess();
  }

  Future<void> _verifyAccess() async {
    final userId = _service.currentUserId;
    if (userId == null) {
      setState(() {
        _isCheckingAccess = false;
        _hasAccess = false;
      });
      return;
    }
    try {
      final profile = await _service
          .fetchProfile(userId)
          .timeout(const Duration(seconds: 12));
      if (!mounted) return;
      setState(() {
        _hasAccess = profile?.role == 'owner';
        _isCheckingAccess = false;
      });
      if (_hasAccess) await _loadRequests();
    } on TimeoutException {
      debugPrint('[Admin] access check timed out');
      if (mounted) {
        setState(() {
          _isCheckingAccess = false;
          _accessCheckFailed = true;
        });
      }
    } catch (e) {
      debugPrint('[Admin] access check error: $e');
      if (mounted) {
        setState(() {
          _isCheckingAccess = false;
          _accessCheckFailed = true;
        });
      }
    }
  }

  Future<void> _loadRequests() async {
    setState(() => _loadError = null);
    try {
      final requests = await _service.fetchSongRequests().timeout(
        const Duration(seconds: 15),
      );
      if (mounted) {
        setState(() {
          _pending = requests.where((r) => r.status == 'pending').toList();
          _resolved = requests.where((r) => r.status != 'pending').toList();
          _isLoading = false;
        });
      }
    } on TimeoutException {
      debugPrint('[Admin] fetch timed out');
      if (mounted) {
        setState(() {
          _isLoading = false;
          _loadError = 'Connection timed out.';
        });
      }
    } catch (e) {
      debugPrint('[Admin] error: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
          _loadError = 'Could not load requests.';
        });
      }
    }
  }

  void _showSnack(String message, {Color accent = AkamoColors.acid}) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          backgroundColor: AkamoColors.graphite,
          elevation: 0,
          shape: RoundedRectangleBorder(
            side: BorderSide(color: accent.withValues(alpha: 0.25)),
            borderRadius: BorderRadius.circular(AkamoRadii.compact),
          ),
          content: Text(
            message,
            style: Theme.of(context).textTheme.bodyMedium
                ?.copyWith(color: AkamoColors.titanium),
          ),
        ),
      );
  }

  Future<void> _setStatus(SongRequestModel request, String status) async {
    setState(() => _busyIds.add(request.id));
    try {
      final ok = await _service
          .updateSongRequestStatus(request.id, status)
          .timeout(const Duration(seconds: 15));
      if (!mounted) return;
      setState(() {
        _busyIds.remove(request.id);
        if (ok) {
          final updated = SongRequestModel(
            id: request.id,
            title: request.title,
            userName: request.userName,
            status: status,
            createdAt: request.createdAt,
          );
          _pending.removeWhere((r) => r.id == request.id);
          _resolved.removeWhere((r) => r.id == request.id);
          _resolved.insert(0, updated);
        }
      });
      _showSnack(
        ok
            ? '"${request.title}" ${status == 'approved' ? 'approved' : 'rejected'}.'
            : 'Status update failed.',
        accent: ok
            ? (status == 'approved' ? AkamoColors.acid : AkamoColors.danger)
            : AkamoColors.danger,
      );
    } on TimeoutException {
      debugPrint('[Admin] status update timed out');
      if (mounted) {
        setState(() => _busyIds.remove(request.id));
        _showSnack('Connection timed out.', accent: AkamoColors.danger);
      }
    } catch (e) {
      debugPrint('[Admin] status update error: $e');
      if (mounted) {
        setState(() => _busyIds.remove(request.id));
        _showSnack('Something went wrong.', accent: AkamoColors.danger);
      }
    }
  }

  String _relativeTime(DateTime createdAt) {
    final diff = DateTime.now().difference(createdAt);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${createdAt.day}/${createdAt.month}/${createdAt.year}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AkamoColors.obsidian,
      body: RefreshIndicator.adaptive(
        color: AkamoColors.obsidian,
        backgroundColor: AkamoColors.acid,
        onRefresh: () async {
          if (!_hasAccess) {
            await _verifyAccess();
          } else {
            await _loadRequests();
          }
        },
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(
            parent: AlwaysScrollableScrollPhysics(),
          ),
          slivers: [
            SliverToBoxAdapter(
              child: SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(8, 12, 20, 0),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(
                          Icons.arrow_back_rounded,
                          color: AkamoColors.titanium,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'ADMIN',
                              style: Theme.of(context).textTheme.labelMedium
                                  ?.copyWith(color: AkamoColors.acid),
                            ),
                            Text(
                              'Song Requests',
                              style: Theme.of(context).textTheme.headlineSmall,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            if (_isCheckingAccess)
              const SliverToBoxAdapter(
                child: SizedBox(
                  height: 300,
                  child: Center(
                    child: CircularProgressIndicator(
                      color: AkamoColors.acid,
                      strokeWidth: 2,
                    ),
                  ),
                ),
              )
            else if (_accessCheckFailed)
              SliverToBoxAdapter(
                child: Padding(
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
                          'Could not verify your access.\nPull down to retry.',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodyMedium
                              ?.copyWith(color: AkamoColors.titaniumMuted),
                        ),
                      ],
                    ),
                  ),
                ),
              )
            else if (!_hasAccess)
              const SliverToBoxAdapter(child: _AccessDenied())
            else ...[
              const SliverToBoxAdapter(child: SizedBox(height: 18)),
              if (_isLoading)
                const SliverToBoxAdapter(
                  child: SizedBox(
                    height: 260,
                    child: Center(
                      child: CircularProgressIndicator(
                        color: AkamoColors.acid,
                        strokeWidth: 2,
                      ),
                    ),
                  ),
                )
              else if (_loadError != null)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 40),
                    child: Center(
                      child: Column(
                        children: [
                          const Icon(
                            Icons.wifi_off_rounded,
                            color: AkamoColors.smoke,
                            size: 40,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            _loadError!,
                            style: Theme.of(context).textTheme.bodyMedium
                                ?.copyWith(color: AkamoColors.titaniumMuted),
                          ),
                        ],
                      ),
                    ),
                  ),
                )
              else ...[
                if (_pending.isNotEmpty) ...[
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
                      child: Row(
                        children: [
                          const _PulseDot(),
                          const SizedBox(width: 7),
                          Text(
                            '${_pending.length} PENDING REVIEW',
                            style: Theme.of(context).textTheme.labelMedium
                                ?.copyWith(color: AkamoColors.acid),
                          ),
                        ],
                      ),
                    ),
                  ),
                  SliverList.separated(
                    itemCount: _pending.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (context, index) => _PendingRequestCard(
                      request: _pending[index],
                      isBusy: _busyIds.contains(_pending[index].id),
                      onApprove: () => _setStatus(_pending[index], 'approved'),
                      onReject: () => _setStatus(_pending[index], 'rejected'),
                      timeLabel: _relativeTime(_pending[index].createdAt),
                    ),
                  ),
                ] else
                  const SliverToBoxAdapter(child: _AllCaughtUp()),
                if (_resolved.isNotEmpty) ...[
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 26, 20, 10),
                      child: Text(
                        'RESOLVED',
                        style: Theme.of(context).textTheme.labelMedium,
                      ),
                    ),
                  ),
                  SliverList.separated(
                    itemCount: _resolved.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 6),
                    itemBuilder: (context, index) {
                      final r = _resolved[index];
                      return _ResolvedRow(
                        request: r,
                        timeLabel: _relativeTime(r.createdAt),
                      );
                    },
                  ),
                ],
              ],
            ],
            const SliverToBoxAdapter(
              child: SizedBox(height: AkamoSpacing.dockClearance),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Request cards ───────────────────────────────────────────────────────────

class _PendingRequestCard extends StatelessWidget {
  const _PendingRequestCard({
    required this.request,
    required this.isBusy,
    required this.onApprove,
    required this.onReject,
    required this.timeLabel,
  });

  final SongRequestModel request;
  final bool isBusy;
  final VoidCallback onApprove;
  final VoidCallback onReject;
  final String timeLabel;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: AkamoGlass(
        radius: AkamoRadii.compact,
        tint: AkamoColors.glassFillStrong,
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AkamoColors.ultraviolet.withValues(alpha: 0.14),
                    border: Border.all(
                      color: AkamoColors.ultraviolet.withValues(alpha: 0.3),
                    ),
                  ),
                  child: const Icon(
                    Icons.music_note_rounded,
                    color: AkamoColors.ultraviolet,
                    size: 17,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    request.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodyLarge
                        ?.copyWith(fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.only(left: 46),
              child: Text(
                'by ${request.userName ?? 'Anonymous'} · $timeLabel',
                style: Theme.of(context).textTheme.bodySmall
                    ?.copyWith(color: AkamoColors.smoke),
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: AkamoTactile(
                    onTap: isBusy ? null : onApprove,
                    scale: 0.96,
                    child: Container(
                      height: 42,
                      decoration: BoxDecoration(
                        color: isBusy
                            ? AkamoColors.glassFillStrong
                            : AkamoColors.acid,
                        borderRadius: BorderRadius.circular(AkamoRadii.pill),
                      ),
                      child: Center(
                        child: isBusy
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  color: AkamoColors.acid,
                                  strokeWidth: 2,
                                ),
                              )
                            : const Text(
                                'APPROVE',
                                style: TextStyle(
                                  color: AkamoColors.obsidian,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 12,
                                  letterSpacing: 1,
                                ),
                              ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: AkamoTactile(
                    onTap: isBusy ? null : onReject,
                    scale: 0.96,
                    child: Container(
                      height: 42,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(AkamoRadii.pill),
                        border: Border.all(
                          color: AkamoColors.danger.withValues(alpha: 0.4),
                        ),
                      ),
                      child: const Center(
                        child: Text(
                          'REJECT',
                          style: TextStyle(
                            color: AkamoColors.danger,
                            fontWeight: FontWeight.w800,
                            fontSize: 12,
                            letterSpacing: 1,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ResolvedRow extends StatelessWidget {
  const _ResolvedRow({required this.request, required this.timeLabel});

  final SongRequestModel request;
  final String timeLabel;

  @override
  Widget build(BuildContext context) {
    final approved = request.status == 'approved';
    final accent = approved ? AkamoColors.acid : AkamoColors.danger;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(AkamoRadii.compact),
          color: AkamoColors.glassFillStrong.withValues(alpha: 0.45),
          border: Border.all(color: AkamoColors.hairline),
        ),
        child: Row(
          children: [
            Icon(
              approved
                  ? Icons.check_circle_outline_rounded
                  : Icons.cancel_outlined,
              color: accent.withValues(alpha: 0.85),
              size: 18,
            ),
            const SizedBox(width: 11),
            Expanded(
              child: Text(
                request.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AkamoColors.titaniumMuted,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            const SizedBox(width: 8),
            Text(
              timeLabel,
              style: Theme.of(context).textTheme.bodySmall
                  ?.copyWith(color: AkamoColors.smoke),
            ),
          ],
        ),
      ),
    );
  }
}

class _PulseDot extends StatefulWidget {
  const _PulseDot();

  @override
  State<_PulseDot> createState() => _PulseDotState();
}

class _PulseDotState extends State<_PulseDot>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1650),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) => Container(
        width: 7,
        height: 7,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: AkamoColors.acid,
          boxShadow: <BoxShadow>[
            BoxShadow(
              color: AkamoColors.acid.withValues(
                alpha: 0.22 + (_controller.value * 0.35),
              ),
              blurRadius: 5 + (_controller.value * 7),
              spreadRadius: _controller.value * 2,
            ),
          ],
        ),
      ),
    );
  }
}

// ─── States ──────────────────────────────────────────────────────────────────

class _AccessDenied extends StatelessWidget {
  const _AccessDenied();

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
                Icons.lock_outline_rounded,
                color: AkamoColors.smoke,
                size: 32,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Owner access only.',
              style: Theme.of(context).textTheme.titleMedium
                  ?.copyWith(color: AkamoColors.titanium),
            ),
            const SizedBox(height: 6),
            Text(
              'This dashboard manages incoming\nsong requests for the whole station.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall
                  ?.copyWith(color: AkamoColors.smoke),
            ),
          ],
        ),
      ),
    );
  }
}

class _AllCaughtUp extends StatelessWidget {
  const _AllCaughtUp();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 30, 20, 0),
      child: AkamoGlass(
        radius: AkamoRadii.compact,
        tint: AkamoColors.glassFillStrong,
        padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 20),
        child: Column(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AkamoColors.acid.withValues(alpha: 0.13),
                border: Border.all(
                  color: AkamoColors.acid.withValues(alpha: 0.3),
                ),
              ),
              child: const Icon(
                Icons.done_all_rounded,
                color: AkamoColors.acid,
                size: 24,
              ),
            ),
            const SizedBox(height: 14),
            Text(
              'All caught up',
              style: Theme.of(context).textTheme.titleMedium
                  ?.copyWith(color: AkamoColors.titanium),
            ),
            const SizedBox(height: 5),
            Text(
              'New listener requests will appear here.',
              style: Theme.of(context).textTheme.bodySmall
                  ?.copyWith(color: AkamoColors.smoke),
            ),
          ],
        ),
      ),
    );
  }
}
