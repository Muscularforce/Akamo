import 'package:flutter/material.dart';

import '../../core/theme/akamo_tokens.dart';
import '../../core/widgets/akamo_glass.dart';
import '../../services/supabase_service.dart';

class CreatePlaylistModal extends StatefulWidget {
  const CreatePlaylistModal({super.key});

  @override
  State<CreatePlaylistModal> createState() => _CreatePlaylistModalState();
}

class _CreatePlaylistModalState extends State<CreatePlaylistModal> {
  final _service = SupabaseService();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  bool _isLoading = false;
  bool _isPublic = false;

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    final title = _titleController.text.trim();
    if (title.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Playlist name cannot be empty.'),
          backgroundColor: AkamoColors.graphite,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final playlist = await _service.createPlaylist(
        title,
        _descController.text.trim(),
        _isPublic,
      );

      if (playlist != null && mounted) {
        Navigator.of(context).pop(true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('"$title" created.'),
            backgroundColor: AkamoColors.acid,
            behavior: SnackBarBehavior.floating,
          ),
        );
      } else if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to create playlist. Please try again.'),
            backgroundColor: AkamoColors.graphite,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      debugPrint('[CreatePlaylist] error: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 24,
        right: 24,
        top: 24,
      ),
      decoration: const BoxDecoration(
        color: AkamoColors.graphite,
        borderRadius: BorderRadius.vertical(top: Radius.circular(AkamoRadii.hero)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'New Playlist',
                style: TextStyle(
                  color: AkamoColors.titanium,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              if (!_isLoading)
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: AkamoColors.smoke),
                  onPressed: () => Navigator.pop(context),
                ),
            ],
          ),
          const SizedBox(height: 24),
          TextField(
            controller: _titleController,
            autofocus: true,
            style: const TextStyle(color: AkamoColors.titanium),
            decoration: InputDecoration(
              hintText: 'My Playlist',
              hintStyle: TextStyle(color: AkamoColors.smoke),
              filled: true,
              fillColor: AkamoColors.obsidian,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AkamoRadii.compact),
                borderSide: BorderSide.none,
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AkamoRadii.compact),
                borderSide: const BorderSide(color: AkamoColors.acid, width: 1),
              ),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _descController,
            maxLines: 2,
            style: const TextStyle(color: AkamoColors.titanium),
            decoration: InputDecoration(
              hintText: 'Description (optional)',
              hintStyle: TextStyle(color: AkamoColors.smoke),
              filled: true,
              fillColor: AkamoColors.obsidian,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AkamoRadii.compact),
                borderSide: BorderSide.none,
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(AkamoRadii.compact),
                borderSide: const BorderSide(color: AkamoColors.acid, width: 1),
              ),
            ),
          ),
          const SizedBox(height: 16),
          AkamoTactile(
            onTap: () => setState(() => _isPublic = !_isPublic),
            scale: 0.97,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: AkamoColors.obsidian,
                borderRadius: BorderRadius.circular(AkamoRadii.compact),
              ),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 22,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(11),
                      color: _isPublic ? AkamoColors.acid : AkamoColors.smoke.withValues(alpha: 0.4),
                    ),
                    child: AnimatedAlign(
                      duration: const Duration(milliseconds: 200),
                      alignment: _isPublic ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        width: 18,
                        height: 18,
                        margin: const EdgeInsets.symmetric(horizontal: 2),
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: AkamoColors.titanium,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Text(
                    'Public',
                    style: TextStyle(color: AkamoColors.titanium, fontSize: 14),
                  ),
                  const Spacer(),
                  Text(
                    _isPublic ? 'Everyone can view' : 'Only you',
                    style: const TextStyle(color: AkamoColors.smoke, fontSize: 12),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 28),
          AkamoTactile(
            onTap: _isLoading ? null : _create,
            scale: 0.96,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 15),
              decoration: BoxDecoration(
                color: _isLoading ? AkamoColors.titaniumMuted : AkamoColors.acid,
                borderRadius: BorderRadius.circular(AkamoRadii.pill),
              ),
              child: Center(
                child: _isLoading
                    ? const SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(
                          color: AkamoColors.obsidian,
                          strokeWidth: 2,
                        ),
                      )
                    : const Text(
                        'CREATE PLAYLIST',
                        style: TextStyle(
                          color: AkamoColors.obsidian,
                          fontWeight: FontWeight.w800,
                          fontSize: 13,
                          letterSpacing: 1,
                        ),
                      ),
              ),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
