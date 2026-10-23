import 'package:flutter/material.dart';

/// Wraps images to strictly enforce nearest-neighbor interpolation,
/// preventing the blurring of 16-bit pixel art during scaling.
class PixelImage extends StatelessWidget {
  final String assetPath;
  final double? width;
  final double? height;
  final BoxFit fit;

  const PixelImage({
    super.key,
    required this.assetPath,
    this.width,
    this.height,
    this.fit = BoxFit.contain,
  });

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      assetPath,
      width: width,
      height: height,
      fit: fit,
      filterQuality: FilterQuality.none, // CRITICAL: Ensures crisp pixel edges
    );
  }
}
