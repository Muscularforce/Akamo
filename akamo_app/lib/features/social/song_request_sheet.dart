import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/theme/akamo_tokens.dart';
import '../../core/widgets/akamo_glass.dart';
import '../../services/supabase_service.dart';

/// In-brand glass sheet where listeners pitch songs for the rotation.
/// One title per line; the whole batch is submitted as individual requests.
class SongRequestSheet extends StatefulWidget {
  const SongRequestSheet({super.key});

  @override
  State<SongRequestSheet> createState() => _SongRequestSheetState();
}

class _SongRequestSheetState extends State<SongRequestSheet> {
  static const _maxRequests = 10;

  final _service = SupabaseService();
  final _titlesController = TextEditingController();
  bool _isSubmitting = false;
  String? _error;

  List<String> get _parsedTitles => _titlesController.text
      .split('\n')
      .map((line) => line.trim())
      .where((line) => line.isNotEmpty)
      .take(_maxRequests)
      .toList();

  @override
  void dispose() {
    _titlesController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final titles = _parsedTitles;
    if (titles.isEmpty) {
      setState(() => _error = 'Add at least one song title.');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    try {
      final profile = _service.currentUserId != null
          ? await _service
                .fetchProfile(_service.currentUserId!)
                .timeout(const Duration(seconds: 12))
          : null;
      final ok = await _service
          .createSongRequest(titles, userName: profile?.displayName)
          .timeout(const Duration(seconds: 15));

      if (!mounted) return;
      if (!ok) {
        setState(() {
          _isSubmitting = false;
          _error = 'Could not send your request. Try again.';
        });
        return;
      }

      final messenger = ScaffoldMessenger.of(context);
      Navigator.of(context).pop(true);
      messenger.showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          backgroundColor: AkamoColors.graphite,
          elevation: 0,
          shape: RoundedRectangleBorder(
            side: BorderSide(color: AkamoColors.acid.withValues(alpha: 0.25)),
            borderRadius: BorderRadius.circular(AkamoRadii.compact),
          ),
          content: Text(
            titles.length == 1
                ? '"${titles.first}" requested — the owner will review it.'
                : '${titles.length} requests sent — the owner will review them.',
            style: const TextStyle(color: AkamoColors.titanium),
          ),
        ),
      );
    } on TimeoutException {
      debugPrint('[SongRequest] submit timed out');
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _error = 'Connection timed out. Check your network.';
        });
      }
    } catch (e) {
      debugPrint('[SongRequest] error: $e');
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _error = 'Something went wrong. Try again.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final count = _parsedTitles.length;
    return Container(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      decoration: const BoxDecoration(
        color: AkamoColors.graphite,
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AkamoRadii.hero),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(2),
                    color: AkamoColors.smoke,
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Request a Song',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                  ),
                  if (!_isSubmitting)
                    IconButton(
                      icon: const Icon(
                        Icons.close_rounded,
                        color: AkamoColors.smoke,
                      ),
                      onPressed: () => Navigator.pop(context),
                    ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                'Pitch tracks for the next rotation. One title per line.',
                style: Theme.of(context).textTheme.bodySmall
                    ?.copyWith(color: AkamoColors.smoke),
              ),
              const SizedBox(height: 18),
              TextField(
                controller: _titlesController,
                autofocus: true,
                maxLines: 4,
                minLines: 3,
                maxLength: 400,
                enabled: !_isSubmitting,
                onChanged: (_) => setState(() {}),
                style: const TextStyle(color: AkamoColors.titanium),
                decoration: InputDecoration(
                  hintText: 'Song title — one per line\ne.g. Midnight City',
                  hintStyle: TextStyle(
                    color: AkamoColors.smoke.withValues(alpha: 0.55),
                    height: 1.5,
                  ),
                  counterStyle: const TextStyle(
                    color: AkamoColors.smoke,
                    fontSize: 11,
                  ),
                  filled: true,
                  fillColor: AkamoColors.obsidian,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 14,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AkamoRadii.compact),
                    borderSide: BorderSide.none,
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AkamoRadii.compact),
                    borderSide: const BorderSide(
                      color: AkamoColors.acid,
                      width: 1,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Text(
                    '$count of $_maxRequests queued',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: count > 0 ? AkamoColors.acid : AkamoColors.smoke,
                      fontWeight: count > 0 ? FontWeight.w700 : null,
                    ),
                  ),
                ],
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AkamoColors.danger.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(AkamoRadii.micro),
                    border: Border.all(
                      color: AkamoColors.danger.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Text(
                    _error!,
                    style: const TextStyle(
                      color: AkamoColors.danger,
                      fontSize: 13,
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 20),
              AkamoTactile(
                onTap: (_isSubmitting || count == 0) ? null : _submit,
                scale: 0.96,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 15),
                  decoration: BoxDecoration(
                    color: count == 0 && !_isSubmitting
                        ? AkamoColors.glassFillStrong
                        : AkamoColors.acid,
                    borderRadius: BorderRadius.circular(AkamoRadii.pill),
                  ),
                  child: Center(
                    child: _isSubmitting
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(
                              color: AkamoColors.obsidian,
                              strokeWidth: 2,
                            ),
                          )
                        : Text(
                            count > 1 ? 'SEND $count REQUESTS' : 'SEND REQUEST',
                            style: TextStyle(
                              color: count == 0
                                  ? AkamoColors.smoke
                                  : AkamoColors.obsidian,
                              fontWeight: FontWeight.w800,
                              fontSize: 13,
                              letterSpacing: 1,
                            ),
                          ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Convenience opener so every entry point shows the sheet identically.
Future<bool> showSongRequestSheet(BuildContext context) async {
  final result = await showModalBottomSheet<bool>(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    builder: (_) => const SongRequestSheet(),
  );
  return result ?? false;
}
