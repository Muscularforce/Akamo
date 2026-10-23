import 'package:flutter/material.dart';

/// The small, intentional design vocabulary used across the Akamo experience.
///
/// Keeping the visual values here prevents a screen-by-screen drift into generic
/// dark UI as the product grows.
abstract final class AkamoColors {
  static const obsidian = Color(0xFF08090C);
  static const obsidianRaised = Color(0xFF101217);
  static const graphite = Color(0xFF181B21);
  static const titanium = Color(0xFFE3E5E8);
  static const titaniumMuted = Color(0xFF9DA4AE);
  static const smoke = Color(0xFF646B76);
  static const acid = Color(0xFFD9FF4A);
  static const acidDim = Color(0xFF9FBE35);
  static const ultraviolet = Color(0xFF9B7CFF);
  static const ember = Color(0xFFFF8D6C);
  static const cyan = Color(0xFF5AD8FF);
  static const danger = Color(0xFFFF5A6B);

  static const glassFill = Color(0x231C2027);
  static const glassFillStrong = Color(0x4A262A32);
  static const glassStroke = Color(0x24FFFFFF);
  static const glassHighlight = Color(0x30FFFFFF);
  static const hairline = Color(0x1AFFFFFF);

  static const backgroundGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: <Color>[Color(0xFF11131A), obsidian, Color(0xFF07080A)],
    stops: <double>[0, 0.42, 1],
  );
}

abstract final class AkamoRadii {
  static const double micro = 10;
  static const double compact = 16;
  static const double panel = 24;
  static const double hero = 32;
  static const double pill = 999;
}

abstract final class AkamoSpacing {
  static const double page = 20;
  static const double section = 32;
  static const double dockClearance = 154;
}

abstract final class AkamoMotion {
  static const Duration quick = Duration(milliseconds: 140);
  static const Duration standard = Duration(milliseconds: 280);
  static const Duration deliberate = Duration(milliseconds: 720);

  static const Curve tactile = Cubic(0.2, 0.8, 0.2, 1);
  static const Curve reveal = Cubic(0.16, 1, 0.3, 1);
}
