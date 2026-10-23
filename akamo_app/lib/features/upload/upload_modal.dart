import 'dart:async';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/theme/akamo_tokens.dart';
import '../../core/widgets/akamo_glass.dart';
import '../../services/supabase_service.dart';

/// Sequential stages of an upload — drives the step indicator and the
/// determinate progress bar.
enum _UploadStep { reading, audio, cover, registering, done }

class UploadModal extends StatefulWidget {
  final VoidCallback? onSuccess;

  const UploadModal({super.key, this.onSuccess});

  @override
  State<UploadModal> createState() => _UploadModalState();
}

class _UploadModalState extends State<UploadModal> {
  static const _audioExtensions = <String>{'mp3', 'wav', 'flac', 'aac', 'm4a'};
  static const _coverExtensions = <String>{'jpg', 'jpeg', 'png', 'webp'};

  /// Determinate markers for each stage of the pipeline.
  static const _stepProgress = <_UploadStep, double>{
    _UploadStep.reading: 0.10,
    _UploadStep.audio: 0.45,
    _UploadStep.cover: 0.75,
    _UploadStep.registering: 0.92,
    _UploadStep.done: 1.0,
  };

  final _service = SupabaseService();

  // Audio bytes are read lazily at upload time so a large FLAC never sits in
  // memory while the user edits metadata. Covers are small — read eagerly so
  // we can show an instant square preview.
  PlatformFile? _audioFile;
  PlatformFile? _coverFile;
  Uint8List? _coverPreviewBytes;

  // Metadata
  final _titleController = TextEditingController();
  final _artistController = TextEditingController();
  final _albumController = TextEditingController();

  bool _isUploading = false;
  double _uploadProgress = 0;
  _UploadStep _step = _UploadStep.reading;
  String? _error;

  @override
  void dispose() {
    _titleController.dispose();
    _artistController.dispose();
    _albumController.dispose();
    super.dispose();
  }

  /// Extracts the lowercase extension from a filename ('song.FLAC' → 'flac').
  static String _extOf(String fileName, String fallback) {
    final dot = fileName.lastIndexOf('.');
    if (dot < 0 || dot == fileName.length - 1) return fallback;
    return fileName.substring(dot + 1).toLowerCase();
  }

  void _advance(_UploadStep step) {
    setState(() {
      _step = step;
      _uploadProgress = _stepProgress[step]!;
    });
  }

  Future<void> _pickAudio() async {
    try {
      final file = await FilePicker.pickFile(type: FileType.audio);
      if (!mounted || file == null) return;

      if (!_audioExtensions.contains(_extOf(file.name, ''))) {
        setState(() =>
            _error = 'Audio must be MP3, WAV, FLAC, or AAC.');
        return;
      }
      setState(() {
        _audioFile = file;
        _error = null;
        // Auto-fill title from filename
        if (_titleController.text.isEmpty) {
          _titleController.text =
              file.name.replaceAll(RegExp(r'\.[^.]+$'), '');
        }
      });
    } catch (_) {
      if (mounted) setState(() => _error = 'Failed to pick audio file.');
    }
  }

  Future<void> _pickCover() async {
    try {
      final file = await FilePicker.pickFile(type: FileType.image);
      if (!mounted || file == null) return;

      if (!_coverExtensions.contains(_extOf(file.name, ''))) {
        setState(() => _error = 'Cover art must be JPG, PNG, or WEBP.');
        return;
      }
      final bytes = await file.readAsBytes();
      if (!mounted) return;
      setState(() {
        _coverFile = file;
        _coverPreviewBytes = bytes;
        _error = null;
      });
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not read that image.');
    }
  }

  void _clearCover() {
    setState(() {
      _coverFile = null;
      _coverPreviewBytes = null;
    });
  }

  Future<void> _upload() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) {
      setState(() => _error = 'You must be signed in to upload.');
      return;
    }
    final audioFile = _audioFile;
    if (audioFile == null) {
      setState(() => _error = 'Please select an audio file.');
      return;
    }
    if (_titleController.text.trim().isEmpty) {
      setState(() => _error = 'Title is required.');
      return;
    }

    setState(() {
      _isUploading = true;
      _error = null;
      _step = _UploadStep.reading;
      _uploadProgress = _stepProgress[_UploadStep.reading]!;
    });

    try {
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final userId = user.id;

      // 1/4 Read — pull audio bytes off disk.
      final audioBytes =
          await audioFile.readAsBytes().timeout(const Duration(seconds: 60));
      final audioExt = _extOf(audioFile.name, 'mp3');

      // 2/4 Audio → songs/audio/{userId}-{timestamp}.ext
      _advance(_UploadStep.audio);
      final audioResult = await _service
          .uploadAudio(userId, timestamp, audioBytes, audioExt)
          .timeout(const Duration(seconds: 120));
      if (audioResult == null) throw Exception('Audio upload failed');

      // 3/4 Cover (optional) → songs/covers/{userId}-{timestamp}.ext
      String coverUrl = '';
      String coverPath = '';
      final coverPreview = _coverPreviewBytes;
      final coverFile = _coverFile;
      if (coverPreview != null && coverFile != null) {
        _advance(_UploadStep.cover);
        final coverResult = await _service
            .uploadCover(userId, timestamp + 1, coverPreview,
                _extOf(coverFile.name, 'jpg'))
            .timeout(const Duration(seconds: 60));
        if (coverResult != null) {
          coverUrl = coverResult['url'] ?? '';
          coverPath = coverResult['path'] ?? '';
        }
      }

      // Artist fallback: the uploader's display name.
      final profile =
          await _service.fetchProfile(userId).timeout(const Duration(seconds: 20));
      final artistName = _artistController.text.trim().isNotEmpty
          ? _artistController.text.trim()
          : profile?.displayName ?? 'Unknown Artist';

      // 4/4 Register track row in `tracks`.
      final trackData = {
        'title': _titleController.text.trim(),
        'artist': artistName,
        'album': _albumController.text.trim().isNotEmpty
            ? _albumController.text.trim()
            : 'Singles',
        'audioUrl': audioResult['url'],
        'audioPath': audioResult['path'],
        'coverUrl': coverUrl,
        'coverPath': coverPath,
        'duration': 0,
        'type': 'audio',
        'uploadedAt': timestamp,
        'ownerId': userId,
        'ownerEmail': user.email ?? '',
      };
      final track = await _service
          .insertTrack(trackData)
          .timeout(const Duration(seconds: 30));
      if (track == null) throw Exception('Failed to create track record');

      _advance(_UploadStep.done);
      await Future.delayed(const Duration(milliseconds: 400));

      if (!mounted) return;
      // Capture before popping — the dialog's context dies with its route.
      final messenger = ScaffoldMessenger.of(context);
      Navigator.of(context).pop();
      widget.onSuccess?.call();
      messenger.showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          backgroundColor: AkamoColors.graphite,
          shape: RoundedRectangleBorder(
            side: BorderSide(color: AkamoColors.acid.withValues(alpha: 0.25)),
            borderRadius: BorderRadius.circular(AkamoRadii.compact),
          ),
          content: Text(
            '"${_titleController.text.trim()}" uploaded successfully!',
            style: const TextStyle(color: AkamoColors.titanium),
          ),
        ),
      );
    } on TimeoutException {
      debugPrint('[Upload] Operation timed out');
      if (mounted) {
        setState(() {
          _isUploading = false;
          _error = 'Connection timed out. Check your network and try again.';
        });
      }
    } catch (e) {
      debugPrint('[Upload] Error: $e');
      if (mounted) {
        setState(() {
          _isUploading = false;
          _error =
              'Upload failed: ${e.toString().replaceAll('Exception: ', '')}';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !_isUploading,
      child: Dialog(
        backgroundColor: Colors.transparent,
        insetPadding:
            const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        child: AkamoGlass(
          radius: AkamoRadii.hero,
          tint: const Color(0xF0101319),
          borderColor: AkamoColors.glassHighlight.withValues(alpha: 0.3),
          padding: const EdgeInsets.all(28),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Upload Track',
                        style:
                            Theme.of(context).textTheme.headlineSmall),
                    IconButton(
                      icon: const Icon(Icons.close_rounded,
                          color: AkamoColors.titaniumMuted),
                      onPressed: () =>
                          Navigator.of(context).pop(),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Audio file picker
                GestureDetector(
                  onTap: _isUploading ? null : _pickAudio,
                  child: Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: AkamoColors.glassFillStrong,
                      borderRadius:
                          BorderRadius.circular(AkamoRadii.compact),
                      border: Border.all(
                        color: _audioFile != null
                            ? AkamoColors.acid.withValues(alpha: 0.5)
                            : AkamoColors.glassStroke,
                        width: _audioFile != null ? 1.5 : 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          _audioFile != null
                              ? Icons.audio_file_rounded
                              : Icons.cloud_upload_outlined,
                          size: 34,
                          color: _audioFile != null
                              ? AkamoColors.acid
                              : AkamoColors.titaniumMuted,
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment:
                                CrossAxisAlignment.start,
                            children: [
                              Text(
                                _audioFile?.name ??
                                    'Tap to select an audio file',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: _audioFile != null
                                      ? AkamoColors.titanium
                                      : AkamoColors.titaniumMuted,
                                  fontWeight: _audioFile != null
                                      ? FontWeight.w600
                                      : FontWeight.normal,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'MP3 · WAV · FLAC · AAC',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: AkamoColors.smoke
                                      .withValues(alpha: 0.6),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Cover image picker + instant square preview
                GestureDetector(
                  onTap: _isUploading ? null : _pickCover,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 12),
                    decoration: BoxDecoration(
                      color: AkamoColors.glassFillStrong,
                      borderRadius:
                          BorderRadius.circular(AkamoRadii.compact),
                      border: Border.all(
                        color: _coverPreviewBytes != null
                            ? AkamoColors.acid.withValues(alpha: 0.5)
                            : AkamoColors.glassStroke,
                      ),
                    ),
                    child: Row(
                      children: [
                        // Square preview container
                        ClipRRect(
                          borderRadius:
                              BorderRadius.circular(AkamoRadii.micro),
                          child: Container(
                            width: 56,
                            height: 56,
                            color: AkamoColors.obsidian,
                            child: _coverPreviewBytes != null
                                ? Image.memory(
                                    _coverPreviewBytes!,
                                    fit: BoxFit.cover,
                                    gaplessPlayback: true,
                                  )
                                : const Icon(Icons.add_photo_alternate_outlined,
                                    color: AkamoColors.titaniumMuted),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            _coverFile?.name ?? 'Add cover art (optional)',
                            style: TextStyle(
                              color: _coverFile != null
                                  ? AkamoColors.titanium
                                  : AkamoColors.titaniumMuted,
                            ),
                          ),
                        ),
                        if (_coverPreviewBytes != null)
                          IconButton(
                            icon: const Icon(Icons.close_rounded,
                                size: 18,
                                color: AkamoColors.titaniumMuted),
                            onPressed:
                                _isUploading ? null : _clearCover,
                          ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // Title
                _AkamoTextField(
                  controller: _titleController,
                  label: 'Title',
                  hint: 'Track title',
                ),
                const SizedBox(height: 12),

                // Artist
                _AkamoTextField(
                  controller: _artistController,
                  label: 'Artist',
                  hint: 'Artist name (default: your display name)',
                ),
                const SizedBox(height: 12),

                // Album
                _AkamoTextField(
                  controller: _albumController,
                  label: 'Album',
                  hint: 'Album name (default: Singles)',
                ),
                const SizedBox(height: 20),

                // Error
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AkamoColors.danger.withValues(alpha: 0.1),
                        borderRadius:
                            BorderRadius.circular(AkamoRadii.micro),
                        border: Border.all(
                            color:
                                AkamoColors.danger.withValues(alpha: 0.3)),
                      ),
                      child: Text(_error!,
                          style: const TextStyle(
                              color: AkamoColors.danger, fontSize: 13)),
                    ),
                  ),

                // Stepped progress state
                if (_isUploading) ...[
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: _StepTrack(step: _step),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: ClipRRect(
                      borderRadius:
                          BorderRadius.circular(AkamoRadii.pill),
                      child: TweenAnimationBuilder<double>(
                        tween: Tween(end: _uploadProgress),
                        duration: const Duration(milliseconds: 300),
                        curve: Curves.easeOutCubic,
                        builder: (context, value, _) =>
                            LinearProgressIndicator(
                          value: value,
                          backgroundColor:
                              AkamoColors.glassFillStrong,
                          valueColor:
                              const AlwaysStoppedAnimation<Color>(
                                  AkamoColors.acid),
                          minHeight: 6,
                        ),
                      ),
                    ),
                  ),
                ],

                // Upload button
                AkamoTactile(
                  onTap: _isUploading ? () {} : _upload,
                  scale: 0.96,
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(
                      color: _isUploading
                          ? AkamoColors.glassFillStrong
                          : AkamoColors.acid,
                      borderRadius:
                          BorderRadius.circular(AkamoRadii.compact),
                    ),
                    child: Center(
                      child: _isUploading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                color: AkamoColors.acid,
                                strokeWidth: 2,
                              ),
                            )
                          : const Text(
                              'UPLOAD',
                              style: TextStyle(
                                color: AkamoColors.obsidian,
                                fontWeight: FontWeight.w800,
                                fontSize: 15,
                                letterSpacing: 1.3,
                              ),
                            ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// READING → AUDIO → COVER → REGISTER step rail synced to [_UploadStep].
class _StepTrack extends StatelessWidget {
  const _StepTrack({required this.step});

  final _UploadStep step;

  static const _labels = <(_UploadStep, String)>[
    (_UploadStep.reading, 'READ'),
    (_UploadStep.audio, 'AUDIO'),
    (_UploadStep.cover, 'COVER'),
    (_UploadStep.registering, 'REGISTER'),
  ];

  @override
  Widget build(BuildContext context) {
    final currentIndex = step == _UploadStep.done
        ? _labels.length
        : _labels.indexWhere((e) => e.$1 == step);

    return Row(
      children: <Widget>[
        for (var i = 0; i < _labels.length; i++) ...<Widget>[
          if (i > 0)
            Expanded(
              child: Container(
                height: 1.4,
                margin: const EdgeInsets.only(bottom: 15),
                color: i <= currentIndex
                    ? AkamoColors.acid.withValues(alpha: 0.55)
                    : AkamoColors.glassStroke,
              ),
            ),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              AnimatedContainer(
                duration: AkamoMotion.quick,
                width: 9,
                height: 9,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: i < currentIndex
                      ? AkamoColors.acid
                      : Colors.transparent,
                  border: Border.all(
                    color: i <= currentIndex
                        ? AkamoColors.acid
                        : AkamoColors.glassStroke,
                    width: 1.4,
                  ),
                  boxShadow: i == currentIndex
                      ? <BoxShadow>[
                          BoxShadow(
                            color:
                                AkamoColors.acid.withValues(alpha: 0.45),
                            blurRadius: 9,
                            spreadRadius: -1,
                          ),
                        ]
                      : null,
                ),
              ),
              const SizedBox(height: 5),
              Text(
                _labels[i].$2,
                style: TextStyle(
                  fontSize: 9,
                  letterSpacing: 1.1,
                  fontWeight: i == currentIndex
                      ? FontWeight.w800
                      : FontWeight.w600,
                  color: i <= currentIndex
                      ? AkamoColors.acid.withValues(alpha: i == currentIndex ? 1 : 0.7)
                      : AkamoColors.titaniumMuted.withValues(alpha: 0.55),
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
}

class _AkamoTextField extends StatelessWidget {
  const _AkamoTextField({
    required this.controller,
    required this.label,
    required this.hint,
  });

  final TextEditingController controller;
  final String label;
  final String hint;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      style: const TextStyle(color: AkamoColors.titanium),
      decoration: InputDecoration(
        labelText: label,
        labelStyle:
            const TextStyle(color: AkamoColors.titaniumMuted, fontSize: 13),
        hintText: hint,
        hintStyle: TextStyle(
            color: AkamoColors.smoke.withValues(alpha: 0.5), fontSize: 14),
        filled: true,
        fillColor: AkamoColors.glassFillStrong,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AkamoRadii.micro),
          borderSide: BorderSide(color: AkamoColors.glassStroke),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AkamoRadii.micro),
          borderSide: BorderSide(color: AkamoColors.glassStroke),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AkamoRadii.micro),
          borderSide:
              BorderSide(color: AkamoColors.acid.withValues(alpha: 0.6)),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }
}
