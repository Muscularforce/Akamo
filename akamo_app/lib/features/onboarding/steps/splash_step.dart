import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/theme/akamo_tokens.dart';

class SplashStep extends StatefulWidget {
  final VoidCallback onFinish;
  
  const SplashStep({super.key, required this.onFinish});

  @override
  State<SplashStep> createState() => _SplashStepState();
}

class _SplashStepState extends State<SplashStep> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
    
    _scaleAnimation = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutBack)
    );
    
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeIn)
    );

    _controller.forward();

    _timer = Timer(const Duration(milliseconds: 2500), () {
      if (mounted) {
        widget.onFinish();
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AkamoColors.obsidian,
      child: Center(
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            return Opacity(
              opacity: _fadeAnimation.value,
              child: Transform.scale(
                scale: _scaleAnimation.value,
                child: Text(
                  'Akamo',
                  style: Theme.of(context).textTheme.displayLarge?.copyWith(
                    color: AkamoColors.titanium,
                    fontSize: 48,
                    letterSpacing: -2,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
