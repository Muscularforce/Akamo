import 'package:flutter/material.dart';

import 'akamo_tokens.dart';

abstract final class AkamoTheme {
  static ThemeData get dark {
    const typography = TextTheme(
      displayLarge: TextStyle(
        fontFamily: 'Roboto',
        fontSize: 43,
        height: 0.98,
        fontWeight: FontWeight.w700,
        letterSpacing: -2.0,
        color: AkamoColors.titanium,
      ),
      displayMedium: TextStyle(
        fontFamily: 'Roboto',
        fontSize: 32,
        height: 1.02,
        fontWeight: FontWeight.w700,
        letterSpacing: -1.4,
        color: AkamoColors.titanium,
      ),
      headlineSmall: TextStyle(
        fontFamily: 'Roboto',
        fontSize: 23,
        height: 1.1,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.7,
        color: AkamoColors.titanium,
      ),
      titleLarge: TextStyle(
        fontFamily: 'Roboto',
        fontSize: 18,
        height: 1.2,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.3,
        color: AkamoColors.titanium,
      ),
      titleMedium: TextStyle(
        fontFamily: 'Roboto',
        fontSize: 15,
        height: 1.25,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.1,
        color: AkamoColors.titanium,
      ),
      bodyMedium: TextStyle(
        fontFamily: 'Roboto',
        fontSize: 14,
        height: 1.45,
        fontWeight: FontWeight.w400,
        letterSpacing: 0.05,
        color: AkamoColors.titaniumMuted,
      ),
      labelLarge: TextStyle(
        fontFamily: 'Roboto',
        fontSize: 11,
        height: 1.2,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.35,
        color: AkamoColors.titanium,
      ),
      labelMedium: TextStyle(
        fontFamily: 'Roboto',
        fontSize: 10,
        height: 1.2,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.1,
        color: AkamoColors.titaniumMuted,
      ),
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AkamoColors.obsidian,
      colorScheme: const ColorScheme.dark(
        primary: AkamoColors.acid,
        onPrimary: AkamoColors.obsidian,
        secondary: AkamoColors.ultraviolet,
        onSecondary: AkamoColors.titanium,
        surface: AkamoColors.obsidianRaised,
        onSurface: AkamoColors.titanium,
        error: AkamoColors.danger,
        onError: AkamoColors.obsidian,
      ),
      textTheme: typography,
      iconTheme: const IconThemeData(color: AkamoColors.titanium),
      splashFactory: NoSplash.splashFactory,
      dividerTheme: const DividerThemeData(
        color: AkamoColors.hairline,
        thickness: 1,
        space: 1,
      ),
      scrollbarTheme: ScrollbarThemeData(
        thumbColor: WidgetStateProperty.all(AkamoColors.titaniumMuted),
        radius: const Radius.circular(AkamoRadii.pill),
      ),
    );
  }
}
