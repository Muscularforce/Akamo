import 'dart:async';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/models/track_model.dart';
import 'core/models/album_model.dart';
import 'core/models/playlist_model.dart';
import 'core/models/user_profile_model.dart';
import 'core/theme/akamo_theme.dart';
import 'core/theme/akamo_tokens.dart';
import 'core/widgets/akamo_glass.dart';
import 'features/account/account_view.dart';
import 'features/home/home_view.dart';
import 'features/explore/explore_view.dart';
import 'features/library/library_view.dart';
import 'features/player/player_view.dart';
import 'features/onboarding/onboarding_view.dart';
import 'services/audio_handler.dart';
import 'services/supabase_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await dotenv.load(fileName: '.env');

  final supabaseUrl = dotenv.env['VITE_SUPABASE_URL'] ?? '';
  final supabaseKey = dotenv.env['VITE_SUPABASE_ANON_KEY'] ?? '';

  // Fail loudly at startup if the environment is not configured — mirrors
  // the website's isSupabaseMisconfigured guard in src/lib/supabase.ts.
  if (supabaseUrl.isEmpty ||
      supabaseKey.isEmpty ||
      supabaseUrl.contains('placeholder') ||
      supabaseUrl.contains('your-project-ref')) {
    debugPrint(
      '[Akamo] Supabase is not configured. Create a .env file with:\n'
      'VITE_SUPABASE_URL=https://<your-project>.supabase.co\n'
      'VITE_SUPABASE_ANON_KEY=<your-anon-key>',
    );
  }

  await Supabase.initialize(url: supabaseUrl, publishableKey: supabaseKey);

  final audioHandler = await initAudioService();

  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: AkamoColors.obsidian,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  runApp(AkamoApp(audioHandler: audioHandler));
}

class AkamoApp extends StatelessWidget {
  final AkamoAudioHandler audioHandler;

  const AkamoApp({super.key, required this.audioHandler});

  @override
  Widget build(BuildContext context) {
    return Provider<AkamoAudioHandler>.value(
      value: audioHandler,
      child: MaterialApp(
        title: 'Akamo',
        debugShowCheckedModeBanner: false,
        theme: AkamoTheme.dark,
        home: const _AuthGate(),
      ),
    );
  }
}

/// Decides whether to show onboarding or the main shell.
/// Allows browsing without login (like the website).
class _AuthGate extends StatefulWidget {
  const _AuthGate();

  @override
  State<_AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<_AuthGate> {
  // Browsing never requires auth. Onboarding opens only when the user
  // explicitly taps a login/upload entry point.
  bool _showOnboarding = false;

  @override
  Widget build(BuildContext context) {
    if (_showOnboarding) {
      return OnboardingView(
        onComplete: () => setState(() => _showOnboarding = false),
        onSkip: () => setState(() => _showOnboarding = false),
      );
    }
    return AkamoShell(
      onLoginRequested: () => setState(() => _showOnboarding = true),
    );
  }
}

class AkamoShell extends StatefulWidget {
  final VoidCallback onLoginRequested;

  const AkamoShell({super.key, required this.onLoginRequested});

  @override
  State<AkamoShell> createState() => _AkamoShellState();
}

class _AkamoShellState extends State<AkamoShell> {
  int _activeIndex = 0;
  final _supabaseService = SupabaseService();
  StreamSubscription<AuthState>? _authSubscription;

  // Auth state
  User? _user;
  UserProfileModel? _userProfile;

  // Data state
  List<TrackModel> _tracks = [];
  List<AlbumModel> _albums = [];
  List<PlaylistMetaModel> _playlists = [];
  bool _isLoadingData = true;
  String _searchQuery = '';

  static const _tabs = <_NavigationDestination>[
    _NavigationDestination('Home', Icons.home_outlined, Icons.home_rounded),
    _NavigationDestination(
      'Explore',
      Icons.explore_outlined,
      Icons.explore_rounded,
    ),
    _NavigationDestination(
      'Library',
      Icons.library_music_outlined,
      Icons.library_music_rounded,
    ),
    _NavigationDestination(
      'Account',
      Icons.person_outline_rounded,
      Icons.person_rounded,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _initAuth();
    _loadData();
  }

  void _initAuth() {
    // Restore any persisted session synchronously.
    final session = Supabase.instance.client.auth.currentSession;
    _user = session?.user;
    if (_user != null) _loadProfile(_user!.id);

    // Listen for auth changes. Only session-level transitions matter here —
    // TOKEN_REFRESHED / USER_UPDATED fire constantly and must not cause
    // redundant profile fetches (Phase 6 refreshes the profile explicitly).
    _authSubscription =
        Supabase.instance.client.auth.onAuthStateChange.listen((data) {
      const sessionEvents = <AuthChangeEvent>{
        AuthChangeEvent.initialSession,
        AuthChangeEvent.signedIn,
        AuthChangeEvent.signedOut,
      };
      if (!sessionEvents.contains(data.event)) return;

      final newUser = data.session?.user;
      if (newUser?.id == _user?.id) return;

      setState(() => _user = newUser);
      if (newUser != null) {
        _loadProfile(newUser.id);
      } else {
        setState(() => _userProfile = null);
      }
    });
  }

  @override
  void dispose() {
    _authSubscription?.cancel();
    super.dispose();
  }

  Future<void> _loadProfile(String userId) async {
    final profile = await _supabaseService.fetchProfile(userId);
    if (mounted) {
      setState(() {
        _userProfile = profile ??
            UserProfileModel(
              id: userId,
              displayName: _user?.userMetadata?['full_name'] as String? ?? '',
              avatarUrl:
                  _user?.userMetadata?['avatar_url'] as String?,
              role: 'user',
            );
      });
    }
  }

  Future<void> _loadData() async {
    try {
      final results = await Future.wait([
        _supabaseService.fetchTracks(),
        _supabaseService.fetchAlbums(),
        _supabaseService.fetchPlaylists(),
      ]);
      if (mounted) {
        setState(() {
          _tracks = results[0] as List<TrackModel>;
          _albums = results[1] as List<AlbumModel>;
          _playlists = results[2] as List<PlaylistMetaModel>;
          _isLoadingData = false;
        });
      }
    } catch (e) {
      debugPrint('[Akamo] loadData error: $e');
      if (mounted) setState(() => _isLoadingData = false);
    }
  }

  /// Reload all data (e.g. after an upload or mutation)
  Future<void> _refreshData() async {
    await _loadData();
  }

  void _onSearch(String query) {
    setState(() => _searchQuery = query);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: <Widget>[
          const Positioned.fill(child: _AmbientBackdrop()),
          IndexedStack(
            index: _activeIndex,
            children: <Widget>[
              HomeView(
                tracks: _tracks,
                albums: _albums,
                playlists: _playlists,
                isLoading: _isLoadingData,
                user: _user,
                userProfile: _userProfile,
                searchQuery: _searchQuery,
                onSearch: _onSearch,
                onLoginRequested: widget.onLoginRequested,
                onRefresh: _refreshData,
              ),
              const ExploreView(),
              const LibraryView(),
              AccountView(
                user: _user,
                userProfile: _userProfile,
                onLoginRequested: widget.onLoginRequested,
                onProfileUpdated: (updated) =>
                    setState(() => _userProfile = updated),
              ),
            ],
          ),
          // Player bar above the dock
          const Positioned(
            left: 0,
            right: 0,
            bottom: 88,
            child: ModernPlayerView(),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: SafeArea(
              minimum: const EdgeInsets.fromLTRB(16, 0, 16, 14),
              child: _AkamoNavigationDock(
                activeIndex: _activeIndex,
                destinations: _tabs,
                onSelected: (index) => setState(() => _activeIndex = index),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AkamoNavigationDock extends StatelessWidget {
  const _AkamoNavigationDock({
    required this.activeIndex,
    required this.destinations,
    required this.onSelected,
  });

  final int activeIndex;
  final List<_NavigationDestination> destinations;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    return AkamoGlass(
      radius: AkamoRadii.panel,
      blur: 24,
      tint: AkamoColors.glassFillStrong,
      borderColor: AkamoColors.glassHighlight.withValues(alpha: 0.26),
      padding: const EdgeInsets.all(6),
      shadows: const <BoxShadow>[
        BoxShadow(
          color: Color(0xD6000000),
          blurRadius: 38,
          offset: Offset(0, 18),
          spreadRadius: -10,
        ),
        BoxShadow(
          color: Color(0x20000000),
          blurRadius: 4,
          offset: Offset(0, 2),
        ),
      ],
      child: Row(
        children: List<Widget>.generate(destinations.length, (index) {
          final destination = destinations[index];
          return Expanded(
            child: _DockItem(
              destination: destination,
              selected: activeIndex == index,
              onTap: () => onSelected(index),
            ),
          );
        }),
      ),
    );
  }
}

class _DockItem extends StatelessWidget {
  const _DockItem({
    required this.destination,
    required this.selected,
    required this.onTap,
  });

  final _NavigationDestination destination;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return AkamoTactile(
      onTap: onTap,
      scale: 0.94,
      borderRadius: AkamoRadii.compact,
      child: AnimatedContainer(
        duration: AkamoMotion.standard,
        curve: AkamoMotion.reveal,
        height: 58,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(AkamoRadii.compact),
          gradient: selected
              ? LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: <Color>[
                    AkamoColors.acid.withValues(alpha: 0.24),
                    AkamoColors.acid.withValues(alpha: 0.08),
                  ],
                )
              : null,
          border: selected
              ? Border.all(color: AkamoColors.acid.withValues(alpha: 0.18))
              : null,
          boxShadow: selected
              ? <BoxShadow>[
                  BoxShadow(
                    color: AkamoColors.acid.withValues(alpha: 0.12),
                    blurRadius: 18,
                    spreadRadius: -5,
                  ),
                ]
              : null,
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Icon(
              selected ? destination.activeIcon : destination.icon,
              size: 21,
              color: selected ? AkamoColors.acid : AkamoColors.titaniumMuted,
            ),
            const SizedBox(height: 4),
            AnimatedDefaultTextStyle(
              duration: AkamoMotion.quick,
              style: Theme.of(context).textTheme.labelMedium!.copyWith(
                color: selected ? AkamoColors.acid : AkamoColors.titaniumMuted,
                letterSpacing: selected ? 0.8 : 0.55,
              ),
              child: Text(destination.label),
            ),
          ],
        ),
      ),
    );
  }
}

class _AmbientBackdrop extends StatelessWidget {
  const _AmbientBackdrop();

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Stack(
        fit: StackFit.expand,
        children: <Widget>[
          const DecoratedBox(
            decoration: BoxDecoration(gradient: AkamoColors.backgroundGradient),
          ),
          Positioned(
            top: -180,
            right: -130,
            child: _AmbientBloom(
              color: AkamoColors.ultraviolet.withValues(alpha: 0.12),
              size: 370,
            ),
          ),
          Positioned(
            top: 320,
            left: -170,
            child: _AmbientBloom(
              color: AkamoColors.cyan.withValues(alpha: 0.07),
              size: 310,
            ),
          ),
          Positioned(
            bottom: -250,
            right: -130,
            child: _AmbientBloom(
              color: AkamoColors.acid.withValues(alpha: 0.055),
              size: 420,
            ),
          ),
        ],
      ),
    );
  }
}

class _AmbientBloom extends StatelessWidget {
  const _AmbientBloom({required this.color, required this.size});

  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return ImageFiltered(
      imageFilter: ImageFilter.blur(sigmaX: 40, sigmaY: 40),
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(shape: BoxShape.circle, color: color),
      ),
    );
  }
}

class _NavigationDestination {
  const _NavigationDestination(this.label, this.icon, this.activeIcon);

  final String label;
  final IconData icon;
  final IconData activeIcon;
}
