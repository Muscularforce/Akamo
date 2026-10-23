import 'package:flutter/material.dart';
import '../../../core/theme/akamo_tokens.dart';

class WelcomeStep extends StatelessWidget {
  final VoidCallback onSignUp;
  final VoidCallback onLogIn;
  final VoidCallback onSkip;

  const WelcomeStep({
    super.key,
    required this.onSignUp,
    required this.onLogIn,
    required this.onSkip,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AkamoColors.obsidian,
      padding: const EdgeInsets.all(24.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Spacer(),
          // Icon or minimal branding here if desired
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: AkamoColors.obsidianRaised,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.music_note,
              color: AkamoColors.titanium,
              size: 32,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Millions of songs.\nFree on Akamo.',
            style: Theme.of(context).textTheme.displayMedium?.copyWith(
              color: AkamoColors.titanium,
              fontWeight: FontWeight.w900,
              height: 1.2,
              letterSpacing: -1,
            ),
            textAlign: TextAlign.center,
          ),
          const Spacer(),
          ElevatedButton(
            onPressed: onSignUp,
            style: ElevatedButton.styleFrom(
              backgroundColor: AkamoColors.acid,
              foregroundColor: AkamoColors.obsidian,
              padding: const EdgeInsets.symmetric(vertical: 20),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(32),
              ),
              elevation: 0,
            ),
            child: const Text(
              'Sign up for free',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.5,
              ),
            ),
          ),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: onLogIn,
            style: ElevatedButton.styleFrom(
              backgroundColor: AkamoColors.obsidianRaised,
              foregroundColor: AkamoColors.titanium,
              padding: const EdgeInsets.symmetric(vertical: 20),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(32),
                side: BorderSide(color: AkamoColors.titaniumMuted.withValues(alpha: 0.2), width: 1),
              ),
              elevation: 0,
            ),
            child: const Text(
              'Log in',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.5,
              ),
            ),
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: onSkip,
            child: const Text(
              'Skip for now', 
              style: TextStyle(
                color: AkamoColors.titaniumMuted,
                fontWeight: FontWeight.w600,
              )
            ),
          ),
          const SizedBox(height: 36), // Padding from bottom
        ],
      ),
    );
  }
}
