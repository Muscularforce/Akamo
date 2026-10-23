import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/theme/akamo_tokens.dart';
import '../../core/widgets/akamo_glass.dart';
import '../../services/supabase_service.dart';

class CreateAlbumModal extends StatefulWidget {
  const CreateAlbumModal({super.key});

  @override
  State<CreateAlbumModal> createState() => _CreateAlbumModalState();
}

class _CreateAlbumModalState extends State<CreateAlbumModal> {
  final _service = SupabaseService();
  final _titleController = TextEditingController();
  final _artistController = TextEditingController();
  final _yearController = TextEditingController(text: '${DateTime.now().year}');
  final _genreController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _titleController.dispose();
    _artistController.dispose();
    _yearController.dispose();
    _genreController.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    final title = _titleController.text.trim();
    final artist = _artistController.text.trim();
    if (title.isEmpty || artist.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Title and artist are required.'),
          backgroundColor: AkamoColors.graphite,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final userId = Supabase.instance.client.auth.currentUser?.id;
      final payload = <String, dynamic>{
        'title': title,
        'artist': artist,
        'year': int.tryParse(_yearController.text.trim()) ?? DateTime.now().year,
        if (_genreController.text.trim().isNotEmpty) 'genre': _genreController.text.trim(),
        'ownerId': ?userId,
      };

      final album = await _service.createAlbum(payload);

      if (album != null && mounted) {
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
            content: Text('Failed to create album. Please try again.'),
            backgroundColor: AkamoColors.graphite,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      debugPrint('[CreateAlbum] error: $e');
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
                'New Album',
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
          const SizedBox(height: 8),
          Text(
            'Create a container for your tracks.',
            style: TextStyle(color: AkamoColors.smoke, fontSize: 13),
          ),
          const SizedBox(height: 24),
          _GlassInput(
            controller: _titleController,
            hint: 'Album title',
            autofocus: true,
          ),
          const SizedBox(height: 12),
          _GlassInput(
            controller: _artistController,
            hint: 'Artist name',
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _GlassInput(
                  controller: _yearController,
                  hint: 'Year',
                  keyboardType: TextInputType.number,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _GlassInput(
                  controller: _genreController,
                  hint: 'Genre (optional)',
                ),
              ),
            ],
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
                        'CREATE ALBUM',
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

class _GlassInput extends StatelessWidget {
  const _GlassInput({
    required this.controller,
    required this.hint,
    this.autofocus = false,
    this.keyboardType,
  });

  final TextEditingController controller;
  final String hint;
  final bool autofocus;
  final TextInputType? keyboardType;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      autofocus: autofocus,
      keyboardType: keyboardType,
      style: const TextStyle(color: AkamoColors.titanium),
      decoration: InputDecoration(
        hintText: hint,
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
    );
  }
}
