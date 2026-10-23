import 'package:flutter/material.dart';

import '../../../core/theme/akamo_tokens.dart';

class AuthHubStep extends StatelessWidget {
  final bool isLogin;
  final VoidCallback onContinueWithEmail;
  final VoidCallback onBack;

  const AuthHubStep({
    super.key,
    required this.isLogin,
    required this.onContinueWithEmail,
    required this.onBack,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AkamoColors.obsidian,
      padding: const EdgeInsets.all(24.0),
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Align(
              alignment: Alignment.centerLeft,
              child: IconButton(
                icon: const Icon(
                  Icons.arrow_back,
                  color: AkamoColors.titanium,
                ),
                onPressed: onBack,
              ),
            ),
            const SizedBox(height: 32),
            Text(
              isLogin ? 'Log in to Akamo' : 'Sign up to start listening',
              style: Theme.of(context).textTheme.displayMedium?.copyWith(
                color: AkamoColors.titanium,
                fontWeight: FontWeight.w900,
                letterSpacing: -1,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 48),

            _buildSocialButton(
              context,
              icon: Icons.g_mobiledata,
              label: 'Continue with Google',
              onPressed: () {
                // Placeholder
              },
            ),
            const SizedBox(height: 12),
            _buildSocialButton(
              context,
              icon: Icons.apple,
              label: 'Continue with Apple',
              onPressed: () {
                // Placeholder
              },
            ),
            const SizedBox(height: 12),
            _buildSocialButton(
              context,
              icon: Icons.facebook,
              label: 'Continue with Facebook',
              onPressed: () {
                // Placeholder
              },
            ),
            const SizedBox(height: 12),
            _buildSocialButton(
              context,
              icon: Icons.email_outlined,
              label: 'Continue with email',
              onPressed: onContinueWithEmail,
              isPrimary: true,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSocialButton(
    BuildContext context, {
    required IconData icon,
    required String label,
    required VoidCallback onPressed,
    bool isPrimary = false,
  }) {
    return ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: isPrimary
            ? AkamoColors.acid
            : AkamoColors.obsidianRaised,
        foregroundColor: isPrimary
            ? AkamoColors.obsidian
            : AkamoColors.titanium,
        padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 24),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(32),
          side: isPrimary
              ? BorderSide.none
              : BorderSide(
                  color: AkamoColors.titaniumMuted.withValues(alpha: 0.3),
                  width: 1,
                ),
        ),
        elevation: 0,
        alignment: Alignment.centerLeft,
      ),
      child: Stack(
        children: [
          Align(alignment: Alignment.centerLeft, child: Icon(icon, size: 24)),
          Align(
            alignment: Alignment.center,
            child: Text(
              label,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}
