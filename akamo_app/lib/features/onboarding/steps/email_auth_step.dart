import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/theme/akamo_tokens.dart';

class EmailAuthStep extends StatefulWidget {
  final bool isLogin;
  final VoidCallback onBack;
  final VoidCallback onSuccess;

  const EmailAuthStep({
    super.key,
    required this.isLogin,
    required this.onBack,
    required this.onSuccess,
  });

  @override
  State<EmailAuthStep> createState() => _EmailAuthStepState();
}

class _EmailAuthStepState extends State<EmailAuthStep> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _isLoading = false;
  String? _error;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) {
      setState(() => _error = 'Please fill in all fields.');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      if (widget.isLogin) {
        await Supabase.instance.client.auth
            .signInWithPassword(email: email, password: password)
            .timeout(const Duration(seconds: 15));
      } else {
        await Supabase.instance.client.auth
            .signUp(email: email, password: password)
            .timeout(const Duration(seconds: 15));
      }

      if (mounted) {
        widget.onSuccess();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = _mapFriendlyError(e);
          _isLoading = false;
        });
      }
    }
  }

  String _mapFriendlyError(dynamic err) {
    final msg = err.toString().toLowerCase();
    if (msg.contains('invalid login') || msg.contains('invalid_credentials')) {
      return 'Incorrect email or password.';
    }
    if (msg.contains('already registered')) {
      return 'User already exists. Try logging in.';
    }
    if (err is AuthException) {
      return err.message;
    }
    return 'Authentication failed. Please try again.';
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      color: AkamoColors.obsidian,
      padding: const EdgeInsets.symmetric(horizontal: 24.0),
      child: SafeArea(
        child: Column(
          children: [
            Align(
              alignment: Alignment.centerLeft,
              child: Padding(
                padding: const EdgeInsets.only(top: 8.0, bottom: 24.0),
                child: IconButton(
                  icon: const Icon(
                    Icons.arrow_back,
                    color: AkamoColors.titanium,
                  ),
                  onPressed: widget.onBack,
                  padding: EdgeInsets.zero,
                  alignment: Alignment.centerLeft,
                ),
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      widget.isLogin ? 'Welcome back' : 'Create an account',
                      style: Theme.of(context).textTheme.displayMedium
                          ?.copyWith(
                            color: AkamoColors.titanium,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -1,
                          ),
                    ),
                    const SizedBox(height: 32),

                    if (_error != null) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AkamoColors.danger.withValues(alpha: 0.1),
                          border: Border.all(color: AkamoColors.danger),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          _error!,
                          style: const TextStyle(
                            color: AkamoColors.danger,
                            fontSize: 14,
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],

                    _buildTextField(
                      controller: _emailController,
                      label: 'Email',
                      hint: 'Enter your email',
                      keyboardType: TextInputType.emailAddress,
                    ),
                    const SizedBox(height: 24),
                    _buildTextField(
                      controller: _passwordController,
                      label: 'Password',
                      hint: 'Enter your password',
                      obscureText: _obscurePassword,
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword
                              ? Icons.visibility_off
                              : Icons.visibility,
                          color: AkamoColors.titaniumMuted,
                        ),
                        onPressed: () => setState(
                          () => _obscurePassword = !_obscurePassword,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            // Persistent bottom CTA
            Padding(
              padding: EdgeInsets.only(
                bottom: bottomInset > 0 ? bottomInset + 16 : 32.0,
                top: 16,
              ),
              child: ElevatedButton(
                onPressed: _isLoading ? null : _handleSubmit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AkamoColors.acid,
                  foregroundColor: AkamoColors.obsidian,
                  padding: const EdgeInsets.symmetric(vertical: 20),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(32),
                  ),
                  elevation: 0,
                  minimumSize: const Size(double.infinity, 60),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 24,
                        width: 24,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            AkamoColors.obsidian,
                          ),
                        ),
                      )
                    : Text(
                        widget.isLogin ? 'Log in' : 'Create account',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    bool obscureText = false,
    TextInputType? keyboardType,
    Widget? suffixIcon,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: AkamoColors.titanium,
            fontWeight: FontWeight.w700,
            fontSize: 16,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          obscureText: obscureText,
          keyboardType: keyboardType,
          style: const TextStyle(color: AkamoColors.titanium),
          decoration: InputDecoration(
            hintText: hint,
            suffixIcon: suffixIcon,
            filled: true,
            fillColor: AkamoColors.obsidianRaised,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 16,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(
                color: AkamoColors.titaniumMuted,
                width: 1,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
