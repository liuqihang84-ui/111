extends RefCounted
## Deterministic game rules kept separate from rendering and input devices.

const WORLD_MIN := Vector2(-11.0, -8.0)
const WORLD_MAX := Vector2(11.0, 8.0)
const SPAWN := Vector2(-8.0, 6.0)
const PORTAL := Vector2(8.0, -5.0)
const NPC_POSITION := Vector2(-7.0, 5.0)
const GUARDIAN_POSITION := Vector2(7.4, -4.0)
const GUARDIAN_MAX_HEALTH := 6
const TOTAL_CRYSTALS := 5
const PLAYER_RADIUS := 0.22
const PLAYER_SPEED := 3.6
const TREE_RADIUS := 0.48
const ENEMY_RADIUS := 0.38
const CRYSTAL_RADIUS := 0.65
const PORTAL_RADIUS := 1.0
const INVULNERABLE_DURATION := 1.5
const MAX_DELTA := 0.1
const SIMULATION_STEP := 1.0 / 120.0
const ATTACK_RANGE := 1.5
const ATTACK_DURATION := 0.18
const ATTACK_COOLDOWN := 0.4
const DASH_SPEED := 9.0
const DASH_DURATION := 0.18
const DASH_COOLDOWN := 1.15
const GUARDIAN_TELEGRAPH_DURATION := 1.3
const GUARDIAN_PULSE_DURATION := 0.2
const GUARDIAN_RECOVER_DURATION := 2.2
const POTION_POSITIONS: Array[Vector2] = [Vector2(-3.0, 1.0), Vector2(4.0, -3.0)]
const TREE_POSITIONS: Array[Vector2] = [
	Vector2(-10.0, -6.0), Vector2(-7.0, -6.5),
	Vector2(-2.0, -6.5), Vector2(2.0, -6.6),
	Vector2(5.0, -6.7), Vector2(10.0, -5.7),
	Vector2(-8.0, -2.5), Vector2(-6.0, -0.8),
	Vector2(-3.0, -2.7), Vector2(3.0, -3.5),
	Vector2(8.0, -2.0), Vector2(10.0, 0.5),
	Vector2(-9.0, 2.8), Vector2(-6.0, 6.5),
	Vector2(-2.0, 5.8), Vector2(1.0, 2.7),
	Vector2(5.0, 2.5), Vector2(8.0, 5.5),
	Vector2(10.0, 7.0), Vector2(-1.0, 0.8),
]
const CRYSTAL_POSITIONS: Array[Vector2] = [
	Vector2(-5.0, 4.0), Vector2(3.0, 5.0), Vector2(1.0, -1.0),
	Vector2(-5.0, -5.0), Vector2(6.0, -4.0),
]

var status: String = "ready"
var player_position: Vector2 = SPAWN
var facing: float = 1.0
var moving: bool = false
var health: int = 3
var elapsed: float = 0.0
var invulnerable_for: float = 0.0
var crystals: Array[Dictionary] = []
var enemies: Array[Dictionary] = []
var last_direction: Vector2 = Vector2.RIGHT
var attack_cooldown: float = 0.0
var attack_for: float = 0.0
var dash_cooldown: float = 0.0
var dash_for: float = 0.0
var quest_started: bool = false
var guardian_awakened: bool = false
var guardian_health: int = GUARDIAN_MAX_HEALTH
var guardian_phase: String = "dormant"
var guardian_timer: float = 0.0
var guardian_pulse_radius: float = 2.3
var potions: Array[Dictionary] = []
var _dash_direction := Vector2.RIGHT
var _guardian_pulse_hit := false


func _init() -> void:
	_reset()


func begin() -> void:
	if status in ["ready", "won", "lost"]:
		_reset()
		status = "playing"


func toggle_pause() -> void:
	if status == "playing":
		status = "paused"
		moving = false
	elif status == "paused":
		status = "playing"


func collected_count() -> int:
	var count := 0
	for crystal in crystals:
		if crystal.collected:
			count += 1
	return count


func defeated_count() -> int:
	var count := 0
	for enemy in enemies:
		if not enemy.alive:
			count += 1
	return count


func attack() -> bool:
	if status != "playing" or attack_cooldown > 0.000001:
		return false
	attack_cooldown = ATTACK_COOLDOWN
	attack_for = ATTACK_DURATION
	# Resolve a swing once; visual frames cannot apply repeated damage.
	for enemy in enemies:
		if enemy.alive and _in_sword_arc(enemy.position):
			enemy.health = maxi(0, int(enemy.health) - 1)
			enemy.hit_for = 0.22
			if enemy.health == 0:
				enemy.alive = false
	if guardian_awakened and guardian_health > 0 and _in_sword_arc(GUARDIAN_POSITION):
		guardian_health = maxi(0, guardian_health - 1)
		if guardian_health == 0:
			guardian_phase = "defeated"
			guardian_timer = 0.0
	return true


func dash(direction: Vector2) -> bool:
	if status != "playing" or dash_cooldown > 0.000001 or not direction.is_finite():
		return false
	_dash_direction = last_direction if direction.is_zero_approx() else direction.normalized()
	if not _dash_direction.is_finite() or _dash_direction.is_zero_approx():
		return false
	last_direction = _dash_direction
	if absf(last_direction.x) > 0.001:
		facing = -1.0 if last_direction.x < 0.0 else 1.0
	dash_for = DASH_DURATION
	dash_cooldown = DASH_COOLDOWN
	invulnerable_for = maxf(invulnerable_for, 0.25)
	return true


func interact() -> bool:
	if status != "playing" or player_position.distance_to(NPC_POSITION) > 1.7:
		return false
	if not quest_started:
		quest_started = true
		health = 3
	return true


func _in_sword_arc(target: Vector2) -> bool:
	var offset := target - player_position
	return offset.length() <= ATTACK_RANGE and offset.dot(last_direction) >= -0.000001


func update(input: Vector2, delta: float) -> void:
	if status != "playing":
		return
	if not input.is_finite() or not is_finite(delta) or delta <= 0.0:
		return
	var direction := input.limit_length(1.0)
	if not direction.is_zero_approx() and dash_for <= 0.0:
		last_direction = direction.normalized()
	if absf(direction.x) > 0.001:
		facing = -1.0 if direction.x < 0.0 else 1.0
	var previous_position := player_position
	var remaining := minf(delta, MAX_DELTA)
	# Small steps prevent crossing thin obstacles or missing a contact event.
	while remaining > 0.000001 and status == "playing":
		var frame_delta := minf(remaining, SIMULATION_STEP)
		remaining -= frame_delta
		elapsed += frame_delta
		invulnerable_for = maxf(0.0, invulnerable_for - frame_delta)
		attack_cooldown = maxf(0.0, attack_cooldown - frame_delta)
		attack_for = maxf(0.0, attack_for - frame_delta)
		dash_cooldown = maxf(0.0, dash_cooldown - frame_delta)
		var dash_delta := minf(dash_for, frame_delta)
		if dash_delta > 0.0:
			_move_player(_dash_direction * DASH_SPEED * dash_delta)
		dash_for = maxf(0.0, dash_for - frame_delta)
		_move_player(direction * PLAYER_SPEED * (frame_delta - dash_delta))
		_update_enemies(frame_delta)
		_collect_crystals()
		_collect_potions()
		_check_damage()
		_update_guardian(frame_delta)
		_try_awaken_guardian()
		if status == "playing" and collected_count() == TOTAL_CRYSTALS and guardian_health == 0:
			if player_position.distance_to(PORTAL) <= PORTAL_RADIUS:
				status = "won"
	moving = status == "playing" and player_position.distance_squared_to(previous_position) > 0.000001


func _reset() -> void:
	status = "ready"
	player_position = SPAWN
	facing = 1.0
	moving = false
	health = 3
	elapsed = 0.0
	invulnerable_for = 0.0
	last_direction = Vector2.RIGHT
	attack_cooldown = 0.0
	attack_for = 0.0
	dash_cooldown = 0.0
	dash_for = 0.0
	_dash_direction = Vector2.RIGHT
	quest_started = false
	guardian_awakened = false
	guardian_health = GUARDIAN_MAX_HEALTH
	guardian_phase = "dormant"
	guardian_timer = 0.0
	guardian_pulse_radius = 2.3
	_guardian_pulse_hit = false
	crystals.clear()
	for position in CRYSTAL_POSITIONS:
		crystals.append({"position": position, "collected": false})
	enemies.clear()
	_add_enemy(Vector2(-1.5, 4.0), 0.0)
	_add_enemy(Vector2(-2.0, -3.0), 2.1)
	_add_enemy(Vector2(6.5, 0.5), 4.2)
	potions.clear()
	for position in POTION_POSITIONS:
		potions.append({"position": position, "collected": false})


func _add_enemy(home: Vector2, phase: float) -> void:
	enemies.append({"home": home, "phase": phase, "position": _patrol_position(home, phase), "alive": true, "health": 2, "hit_for": 0.0})


func _patrol_position(home: Vector2, phase: float) -> Vector2:
	return home + Vector2(sin(phase) * 1.15, cos(phase) * 0.75)


func _update_enemies(delta: float) -> void:
	for enemy in enemies:
		enemy.hit_for = maxf(0.0, float(enemy.hit_for) - delta)
		if not enemy.alive:
			continue
		enemy.phase += delta * 0.85
		var target: Vector2 = _patrol_position(enemy.home, enemy.phase)
		var speed := 1.4
		if enemy.position.distance_to(player_position) <= 2.25:
			target = player_position
			speed = 1.15
		var point: Vector2 = enemy.position.move_toward(target, speed * delta)
		enemy.position = point.clamp(WORLD_MIN + Vector2.ONE * ENEMY_RADIUS, WORLD_MAX - Vector2.ONE * ENEMY_RADIUS)


func _move_player(displacement: Vector2) -> void:
	var candidate := player_position
	candidate.x = clampf(candidate.x + displacement.x, WORLD_MIN.x + PLAYER_RADIUS, WORLD_MAX.x - PLAYER_RADIUS)
	if _can_stand(candidate):
		player_position = candidate
	candidate = player_position
	candidate.y = clampf(candidate.y + displacement.y, WORLD_MIN.y + PLAYER_RADIUS, WORLD_MAX.y - PLAYER_RADIUS)
	if _can_stand(candidate):
		player_position = candidate


func _can_stand(position: Vector2) -> bool:
	var separation := PLAYER_RADIUS + TREE_RADIUS
	for tree in TREE_POSITIONS:
		if position.distance_squared_to(tree) < separation * separation - 0.000001:
			return false
	return true


func _collect_crystals() -> void:
	for crystal in crystals:
		if not crystal.collected and player_position.distance_to(crystal.position) <= CRYSTAL_RADIUS:
			crystal.collected = true


func _check_damage() -> void:
	if invulnerable_for > 0.0:
		return
	for enemy in enemies:
		if enemy.alive and player_position.distance_to(enemy.position) <= PLAYER_RADIUS + ENEMY_RADIUS:
			_damage_player()
			return


func _damage_player() -> bool:
	if status != "playing" or invulnerable_for > 0.0:
		return false
	health = maxi(0, health - 1)
	invulnerable_for = INVULNERABLE_DURATION
	if health == 0:
		status = "lost"
		moving = false
	return true


func _collect_potions() -> void:
	for potion in potions:
		if health < 3 and not potion.collected and player_position.distance_to(potion.position) <= CRYSTAL_RADIUS:
			potion.collected = true
			health += 1


func _try_awaken_guardian() -> void:
	if status != "playing" or guardian_awakened or collected_count() != TOTAL_CRYSTALS:
		return
	if player_position.distance_to(PORTAL) <= 2.0:
		guardian_awakened = true
		guardian_phase = "telegraph"
		guardian_timer = GUARDIAN_TELEGRAPH_DURATION
		health = 3
		invulnerable_for = INVULNERABLE_DURATION


func _update_guardian(delta: float) -> void:
	if status != "playing" or not guardian_awakened or guardian_health <= 0:
		return
	if guardian_phase == "pulse" and not _guardian_pulse_hit:
		if player_position.distance_to(GUARDIAN_POSITION) <= guardian_pulse_radius:
			_guardian_pulse_hit = true
			_damage_player()
	guardian_timer -= delta
	if guardian_timer > 0.000001:
		return
	match guardian_phase:
		"telegraph":
			guardian_phase = "pulse"
			guardian_timer = GUARDIAN_PULSE_DURATION
			_guardian_pulse_hit = false
		"pulse":
			guardian_phase = "recover"
			guardian_timer = GUARDIAN_RECOVER_DURATION
		"recover":
			guardian_phase = "telegraph"
			guardian_timer = GUARDIAN_TELEGRAPH_DURATION


func export_state() -> Dictionary:
	var crystal_flags: Array = []
	var defeated_flags: Array = []
	var potion_flags: Array = []
	for crystal in crystals:
		crystal_flags.append(bool(crystal.collected))
	for enemy in enemies:
		defeated_flags.append(not enemy.alive)
	for potion in potions:
		potion_flags.append(bool(potion.collected))
	return {
		"version": 1, "position": [player_position.x, player_position.y],
		"health": health, "elapsed": elapsed, "quest_started": quest_started,
		"crystals": crystal_flags, "defeated_enemies": defeated_flags,
		"potions": potion_flags, "guardian_awakened": guardian_awakened,
		"guardian_health": guardian_health,
	}


func import_state(data: Dictionary) -> bool:
	# Validate every field before mutating this model. JSON numbers may be floats.
	if not _valid_integer(data.get("version"), 1, 1):
		return false
	var position_data = data.get("position")
	if typeof(position_data) != TYPE_ARRAY or position_data.size() != 2:
		return false
	if not _finite_number(position_data[0]) or not _finite_number(position_data[1]):
		return false
	var position := Vector2(float(position_data[0]), float(position_data[1]))
	if not position.is_finite() or position.x < WORLD_MIN.x + PLAYER_RADIUS or position.x > WORLD_MAX.x - PLAYER_RADIUS or position.y < WORLD_MIN.y + PLAYER_RADIUS or position.y > WORLD_MAX.y - PLAYER_RADIUS or not _can_stand(position):
		return false
	if not _valid_integer(data.get("health"), 1, 3) or not _finite_number(data.get("elapsed")) or float(data.elapsed) < 0.0:
		return false
	if typeof(data.get("quest_started")) != TYPE_BOOL or typeof(data.get("guardian_awakened")) != TYPE_BOOL:
		return false
	if not _valid_bool_array(data.get("crystals"), TOTAL_CRYSTALS) or not _valid_bool_array(data.get("defeated_enemies"), 3) or not _valid_bool_array(data.get("potions"), 2):
		return false
	if not _valid_integer(data.get("guardian_health"), 0, GUARDIAN_MAX_HEALTH):
		return false
	if not data.guardian_awakened and int(data.guardian_health) != GUARDIAN_MAX_HEALTH:
		return false
	if data.guardian_awakened and data.crystals.count(true) != TOTAL_CRYSTALS:
		return false
	_reset()
	player_position = position
	health = int(data.health)
	elapsed = float(data.elapsed)
	quest_started = data.quest_started
	for index in range(crystals.size()):
		crystals[index].collected = data.crystals[index]
	for index in range(enemies.size()):
		enemies[index].alive = not data.defeated_enemies[index]
		enemies[index].health = 0 if data.defeated_enemies[index] else 2
	for index in range(potions.size()):
		potions[index].collected = data.potions[index]
	guardian_awakened = data.guardian_awakened
	guardian_health = int(data.guardian_health)
	if guardian_awakened:
		guardian_phase = "telegraph" if guardian_health > 0 else "defeated"
		guardian_timer = GUARDIAN_TELEGRAPH_DURATION if guardian_health > 0 else 0.0
	status = "playing"
	invulnerable_for = INVULNERABLE_DURATION
	return true


func _finite_number(value: Variant) -> bool:
	return typeof(value) in [TYPE_INT, TYPE_FLOAT] and is_finite(float(value))


func _valid_integer(value: Variant, minimum: int, maximum: int) -> bool:
	return _finite_number(value) and float(value) == floorf(float(value)) and float(value) >= minimum and float(value) <= maximum


func _valid_bool_array(value: Variant, expected_size: int) -> bool:
	if typeof(value) != TYPE_ARRAY or value.size() != expected_size:
		return false
	for flag in value:
		if typeof(flag) != TYPE_BOOL:
			return false
	return true
