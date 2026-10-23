import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/akamo_tokens.dart';

/// A single-blur liquid glass layer. Keep this as the outermost surface of a
/// component; nested backdrop filters are intentionally avoided for GPU health.
class AkamoGlass extends StatelessWidget {
  const AkamoGlass({
    required this.child,
    super.key,
    this.padding,
    this.radius = AkamoRadii.panel,
    this.blur = 18,
    this.tint = AkamoColors.glassFill,
    this.borderColor = AkamoColors.glassStroke,
    this.shadows,
  });

  final Widget child;
  final EdgeInsetsGeometry? padding;
  final double radius;
  final double blur;
  final Color tint;
  final Color borderColor;
  final List<BoxShadow>? shadows;

  @override
  Widget build(BuildContext context) {
    final borderRadius = BorderRadius.circular(radius);
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: borderRadius,
        boxShadow:
            shadows ??
            <BoxShadow>[
              const BoxShadow(
                color: Color(0x90000000),
                offset: Offset(0, 16),
                blurRadius: 32,
                spreadRadius: -14,
              ),
              const BoxShadow(
                color: Color(0x16000000),
                offset: Offset(0, 3),
                blurRadius: 5,
              ),
            ],
      ),
      child: ClipRRect(
        borderRadius: borderRadius,
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
          child: Container(
            padding: padding,
            decoration: BoxDecoration(
              borderRadius: borderRadius,
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: <Color>[
                  AkamoColors.glassHighlight.withValues(alpha: 0.2),
                  tint,
                  tint.withValues(alpha: 0.72),
                ],
                stops: const <double>[0, 0.24, 1],
              ),
              border: Border.all(color: borderColor),
            ),
            child: child,
          ),
        ),
      ),
    );
  }
}

class AkamoTactile extends StatefulWidget {
  const AkamoTactile({
    required this.child,
    required this.onTap,
    super.key,
    this.scale = 0.975,
    this.borderRadius = AkamoRadii.compact,
    this.enableHaptics = true,
  });

  final Widget child;
  final VoidCallback? onTap;
  final double scale;
  final double borderRadius;
  final bool enableHaptics;

  @override
  State<AkamoTactile> createState() => _AkamoTactileState();
}

class _AkamoTactileState extends State<AkamoTactile> {
  bool _isPressed = false;
  bool _isHovering = false;

  void _setPressed(bool value) {
    if (mounted) {
      setState(() => _isPressed = value);
    }
  }

  @override
  Widget build(BuildContext context) {
    final active = _isPressed || _isHovering;
    return MouseRegion(
      cursor: widget.onTap == null
          ? MouseCursor.defer
          : SystemMouseCursors.click,
      onEnter: (_) => setState(() => _isHovering = true),
      onExit: (_) => setState(() => _isHovering = false),
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: widget.onTap == null ? null : (_) => _setPressed(true),
        onTapCancel: () => _setPressed(false),
        onTapUp: (_) => _setPressed(false),
        onTap: widget.onTap == null
            ? null
            : () {
                if (widget.enableHaptics) {
                  HapticFeedback.selectionClick();
                }
                widget.onTap?.call();
              },
        child: AnimatedScale(
          scale: _isPressed ? widget.scale : 1,
          duration: AkamoMotion.quick,
          curve: AkamoMotion.tactile,
          child: AnimatedOpacity(
            opacity: _isPressed ? 0.88 : (active ? 0.98 : 1),
            duration: AkamoMotion.quick,
            curve: AkamoMotion.tactile,
            child: widget.child,
          ),
        ),
      ),
    );
  }
}
