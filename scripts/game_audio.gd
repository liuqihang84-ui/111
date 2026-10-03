extends Node
## Original, pre-rendered demo music and one-shots. No live synthesis is performed.
## Call setup() once after adding this node, then set_region()/play_event().

const MUSIC_BUS := "LumenfallMusic"
const EFFECT_BUS := "LumenfallEffects"
const CROSSFADE_SECONDS := 1.2
const VOICE_COUNT := 6
const MUSIC_TRACKS := ["title", "village", "forest", "marsh", "ruins", "city", "sanctuary", "battle", "ending"]
const EFFECTS := ["attack", "dash", "pulse", "hurt", "collect", "interact", "save", "win"]
const REGION_TRACKS := {
	"m00": "village", "m01": "forest", "m02": "forest", "m03": "forest",
	"m04": "marsh", "m05": "marsh", "m06": "marsh",
	"m07": "ruins", "m08": "ruins", "m09": "ruins",
	"m10": "city", "m11": "city", "m12": "city",
	"m13": "sanctuary", "m14": "sanctuary",
	"menu": "title", "prologue": "village", "hub": "village",
	"chapter1": "forest", "chapter2": "marsh", "chapter3": "ruins",
	"chapter4": "city", "chapter5": "sanctuary", "won": "ending"
}
const EVENT_ALIASES := {
	"hit": "hurt", "damage": "hurt", "hurt_player": "hurt",
	"pickup": "collect", "crystal": "collect", "coin": "collect",
	"potion": "collect", "heal": "collect", "upgrade": "collect",
	"talk": "interact", "dialogue": "interact", "quest": "interact",
	"gate": "interact", "map": "interact", "checkpoint": "save",
	"victory": "win", "boss_defeated": "win", "dodge": "dash",
	"light_pulse": "pulse", "swing": "attack", "shield": "pulse",
	"lantern": "interact", "block": "interact", "death": "hurt",
	"camp": "save", "travel": "interact", "shop": "interact",
	"enemy_defeated": "collect", "quest_completed": "save", "puzzle_solved": "save"
}

var _music: Dictionary = {}
var _effects: Dictionary = {}
var _players: Array[AudioStreamPlayer] = []
var _voices: Array[AudioStreamPlayer] = []
var _player_tracks: Array[String] = ["", ""]
var _gains: Array[float] = [0.0, 0.0]
var _fade_starts: Array[float] = [0.0, 0.0]
var _fade_targets: Array[float] = [0.0, 0.0]
var _fade_elapsed := 0.0
var _ready_audio := false
var _target_track := ""
var _next_voice := 0
var _volume := 0.75
var _recent_events: Dictionary = {}


func setup() -> void:
	if _ready_audio:
		return
	_ensure_bus(MUSIC_BUS)
	_ensure_bus(EFFECT_BUS)
	for track: String in MUSIC_TRACKS:
		var stream := load("res://assets/audio/music_%s.wav" % track) as AudioStreamWAV
		if stream == null:
			push_warning("Missing music: %s" % track)
			continue
		# Duplicate the imported resource before changing its loop properties.
		stream = stream.duplicate() as AudioStreamWAV
		stream.loop_mode = AudioStreamWAV.LOOP_FORWARD
		stream.loop_begin = 0
		stream.loop_end = roundi(stream.get_length() * float(stream.mix_rate))
		_music[track] = stream
	for event: String in EFFECTS:
		var stream := load("res://assets/audio/sfx_%s.wav" % event) as AudioStreamWAV
		if stream != null:
			_effects[event] = stream
	for index in range(2):
		var player := AudioStreamPlayer.new()
		player.name = "Music%d" % index
		player.bus = MUSIC_BUS
		player.volume_db = -80.0
		add_child(player)
		_players.append(player)
	for index in range(VOICE_COUNT):
		var voice := AudioStreamPlayer.new()
		voice.name = "Effect%d" % index
		voice.bus = EFFECT_BUS
		add_child(voice)
		_voices.append(voice)
	_ready_audio = true
	set_volume(_volume)
	set_process(false)


func set_region(region: String, battle: bool = false) -> void:
	if not _ready_audio:
		setup()
	var key := region.strip_edges().to_lower()
	var track: String = str(REGION_TRACKS.get(key, key))
	if battle and track != "title" and track != "ending":
		track = "battle"
	if not _music.has(track):
		track = "forest"
	if track == _target_track:
		return
	_target_track = track
	var next_player := -1
	# Return to a still-playing previous track without restarting its melody.
	for index in range(2):
		if _player_tracks[index] == track and _players[index].playing:
			next_player = index
			break
	if next_player < 0:
		next_player = 0 if _gains[0] <= _gains[1] else 1
		_players[next_player].stop()
		_players[next_player].stream = _music[track]
		_player_tracks[next_player] = track
		_gains[next_player] = 0.0
		_players[next_player].volume_db = -80.0
		_players[next_player].play()
	_fade_starts[0] = _gains[0]
	_fade_starts[1] = _gains[1]
	_fade_targets[0] = 1.0 if next_player == 0 else 0.0
	_fade_targets[1] = 1.0 if next_player == 1 else 0.0
	_fade_elapsed = 0.0
	set_process(true)


func set_volume(value: float) -> void:
	_volume = clampf(value, 0.0, 1.0)
	for bus_name: String in [MUSIC_BUS, EFFECT_BUS]:
		var index := AudioServer.get_bus_index(bus_name)
		if index >= 0:
			# Muting the bus gives actual silence at zero, independently of gains.
			AudioServer.set_bus_mute(index, _volume <= 0.0)
			AudioServer.set_bus_volume_db(index, linear_to_db(maxf(_volume, 0.0001)))


func play_event(event: String) -> void:
	if not _ready_audio:
		setup()
	var key := event.to_lower().strip_edges()
	if key in ["tone_low", "tone_high", "tone_mid"]:
		key = key.replace("tone_", "tone:")
	var pitch := 1.0
	var debounce_key := key
	if key.get_slice(":", 0) == "tone":
		var note := key.get_slice(":", 1)
		var pitches := {"low": 0.75, "high": 1.5, "mid": 1.0}
		if not pitches.has(note):
			return
		pitch = float(pitches[note])
		key = "interact"
		debounce_key = "tone:" + note
	# The model can append an ID after a colon, e.g. collect:crystal_3.
	key = key.get_slice(":", 0)
	key = str(EVENT_ALIASES.get(key, key))
	if not debounce_key.begins_with("tone:"):
		debounce_key = key
	if not _effects.has(key):
		return
	var now := Time.get_ticks_msec()
	# Coalesce many collision events from a single physics frame.
	if now - int(_recent_events.get(debounce_key, -10000)) < 70:
		return
	_recent_events[debounce_key] = now
	var voice := _voices[_next_voice]
	_next_voice = (_next_voice + 1) % VOICE_COUNT
	voice.stop()
	voice.stream = _effects[key]
	voice.pitch_scale = pitch
	voice.volume_db = -7.0 if key in ["attack", "dash"] else -3.0
	voice.play()


func _process(delta: float) -> void:
	_fade_elapsed = minf(_fade_elapsed + delta, CROSSFADE_SECONDS)
	var fraction := smoothstep(0.0, 1.0, _fade_elapsed / CROSSFADE_SECONDS)
	for index in range(2):
		_gains[index] = lerpf(_fade_starts[index], _fade_targets[index], fraction)
		_players[index].volume_db = linear_to_db(maxf(_gains[index] * 0.62, 0.0001))
	if _fade_elapsed >= CROSSFADE_SECONDS:
		for index in range(2):
			if _fade_targets[index] == 0.0:
				_players[index].stop()
		set_process(false)


func stop_all() -> void:
	set_process(false)
	_target_track = ""
	for player in _players:
		player.stop()
		player.stream = null
	for voice in _voices:
		voice.stop()
		voice.stream = null


func _ensure_bus(bus_name: String) -> void:
	if AudioServer.get_bus_index(bus_name) >= 0:
		return
	AudioServer.add_bus()
	var index := AudioServer.bus_count - 1
	AudioServer.set_bus_name(index, bus_name)
	AudioServer.set_bus_send(index, "Master")
