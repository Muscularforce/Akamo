import 'dart:math';

import 'package:flutter/material.dart';

class GradientBackground extends StatefulWidget {
  final Widget child;

  const GradientBackground({super.key, required this.child});

  @override
  State<GradientBackground> createState() => _GradientBackgroundState();
}

class _GradientBackgroundState extends State<GradientBackground>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 10),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Base dark background
        Container(color: Colors.black),
        // Animated gradient blobs
        AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            return CustomPaint(
              painter: _BlobPainter(_controller.value),
              size: Size.infinite,
            );
          },
        ),
        // Foreground content
        widget.child,
      ],
    );
  }
}

class _BlobPainter extends CustomPainter {
  final double progress;

  _BlobPainter(this.progress);

  @override
  void paint(Canvas canvas, Size size) {
    final paint1 = Paint()
      ..color = const Color(0xFF1DB954).withValues(alpha: 0.15)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 100);

    final paint2 = Paint()
      ..color = const Color(0xFF1ED760).withValues(alpha: 0.1)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 120);

    // Blob 1 (Top Left moving towards center)
    final dx1 = size.width * 0.2 + (sin(progress * pi * 2) * 50);
    final dy1 = size.height * 0.2 + (cos(progress * pi * 2) * 50);
    canvas.drawCircle(Offset(dx1, dy1), 200, paint1);

    // Blob 2 (Bottom Right moving towards center)
    final dx2 = size.width * 0.8 + (cos(progress * pi * 2) * 50);
    final dy2 = size.height * 0.8 + (sin(progress * pi * 2) * 50);
    canvas.drawCircle(Offset(dx2, dy2), 250, paint2);
  }

  @override
  bool shouldRepaint(covariant _BlobPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}
