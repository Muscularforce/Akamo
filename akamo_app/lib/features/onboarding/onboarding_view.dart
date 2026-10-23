import 'package:flutter/material.dart';
import 'steps/splash_step.dart';
import 'steps/welcome_step.dart';
import 'steps/auth_hub_step.dart';
import 'steps/email_auth_step.dart';

class OnboardingView extends StatefulWidget {
  final VoidCallback onComplete;
  final VoidCallback onSkip;

  const OnboardingView({super.key, required this.onComplete, required this.onSkip});

  @override
  State<OnboardingView> createState() => _OnboardingViewState();
}

class _OnboardingViewState extends State<OnboardingView> {
  final PageController _pageController = PageController();
  bool _isLogin = false;

  void _nextPage() {
    _pageController.nextPage(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  void _previousPage() {
    _pageController.previousPage(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      resizeToAvoidBottomInset: false, // Handled inside email_auth_step
      body: PageView(
        controller: _pageController,
        physics: const NeverScrollableScrollPhysics(),
        children: [
          SplashStep(
            onFinish: _nextPage,
          ),
          WelcomeStep(
            onSignUp: () {
              setState(() => _isLogin = false);
              _nextPage();
            },
            onLogIn: () {
              setState(() => _isLogin = true);
              _nextPage();
            },
            onSkip: widget.onSkip,
          ),
          AuthHubStep(
            isLogin: _isLogin,
            onBack: _previousPage,
            onContinueWithEmail: _nextPage,
          ),
          EmailAuthStep(
            isLogin: _isLogin,
            onBack: _previousPage,
            onSuccess: widget.onComplete,
          ),
        ],
      ),
    );
  }
}
