extends RefCounted
## Complete campaign rules. Rendering, device input and disk IO stay outside.

const Data = preload("res://scripts/campaign_data.gd")
const Puzzles = preload("res://scripts/puzzle_rules.gd")
const PLAYER_RADIUS := 0.25
const PLAYER_SPEED := 3.6
const MAX_DELTA := 0.1
const STEP := 1.0 / 120.0
const ABILITY_IDS: Array[String] = ["pulse", "lens", "echo", "shield"]
const DIFFICULTIES: Array[String] = ["story", "standard", "challenge"]

var status := "ready"
var map_id := 0
var map_revision := 0
var player_position := Vector2.ZERO
var last_direction := Vector2.RIGHT
var moving := false
var health := 100
var max_health := 100
var light := 100.0
var max_light := 100.0
var coins := 20
var potions := 3
var elapsed := 0.0
var attack_for := 0.0
var dash_for := 0.0
var invulnerable_for := 0.0
var pulse_for := 0.0
var shield_for := 0.0
var lantern_for := 0.0
var attack_cooldown := 0.0
var dash_cooldown := 0.0
var pulse_cooldown := 0.0
var shield_cooldown := 0.0
var enemies: Array[Dictionary] = []
var objects: Array[Dictionary] = []
var boss: Dictionary = {}
var boss_phase_text := ""
var slow_for := 0.0
var projectiles: Array[Dictionary] = []
var hazards: Array[Dictionary] = []
var puzzle_states: Dictionary = {}
var flags: Dictionary = {}
var abilities: Array[String] = []
var owned_charms: Array[String] = []
var equipped_charm := ""
var equipped_charms: Array[String] = []
var dialogue_lines: Array[String] = []
var dialogue_index := 0
var dialogue_speaker := ""
var dialogue_choices: Array[Dictionary] = []
var toast := ""
var toast_revision := 0
var events: Array[String] = []
var difficulty := "standard"
var checkpoint_map := 0
var checkpoint_position := Vector2.ZERO
var _map: Dictionary = {}
var _dash_direction := Vector2.RIGHT
var _shield_strength := 0.0
var _light_delay := 0.0
var _combo := 0
var _combo_window := 0.0
var _dialogue_return := "playing"
var _selected_charm_slot := 0
var _dialogue_scene_id := ""
var _dialogue_queue: Array[Dictionary] = []
var _choice_quest_id := ""
var _tone_index := 0


func _init() -> void:
	equipped_charms.assign(["", ""])
	_enter_map(0)
	checkpoint_position = player_position


func begin(selected_difficulty: String = "standard") -> void:
	difficulty = selected_difficulty if selected_difficulty in DIFFICULTIES else "standard"
	flags.clear()
	puzzle_states.clear()
	for puzzle in Puzzles.definitions():
		puzzle_states[puzzle.id] = Puzzles.initial_state(str(puzzle.id))
	abilities.clear()
	owned_charms.clear()
	equipped_charm = ""
	equipped_charms.assign(["", ""])
	_selected_charm_slot = 0
	max_health = 100
	max_light = 100.0
	health = max_health
	light = max_light
	coins = 20
	potions = 3
	elapsed = 0.0
	checkpoint_map = 0
	_clear_transient()
	_enter_map(0)
	checkpoint_position = player_position
	status = "playing"
	_event("save")
	_notify("林恩的旅程开始了。举灯观察村庄，向阿芙或小禾问路。")
	_request_intro()


func map_info() -> Dictionary:
	return _map.duplicate(true)


func has_ability(id: String) -> bool:
	return id in abilities


func can_stand(point: Vector2) -> bool:
	return _standable(point)


func objective_progress() -> Vector2i:
	var required: Array = _map.get("required", [])
	var done := 0
	for key in required:
		if flags.get("object:" + str(key), false):
			done += 1
	var total := required.size()
	for puzzle in Puzzles.definitions():
		if puzzle.map_id == map_id and puzzle.required:
			total += 1
			if _puzzle_complete(str(puzzle.id)):
				done += 1
	if not boss.is_empty():
		total += 1
		if boss.health <= 0:
			done += 1
	return Vector2i(done, total)


func objective_text() -> String:
	for object in objects:
		if object.id in _map.get("required", []) and not object.completed:
			if object.type == "rune" and int(object.get("order", 0)) > 0:
				return "举灯辨认纹样，按照回流记录的线索连接符文"
			if object.get("ability", "") != "" and object.ability not in abilities:
				return "先取得灯的能力，再探索：" + str(object.title)
			return "寻找并互动：" + str(object.title)
	if not boss.is_empty() and boss.health > 0:
		for puzzle in Puzzles.definitions():
			if puzzle.map_id == map_id and puzzle.required and not _puzzle_complete(str(puzzle.id)):
				return "解开灯光机关：" + str(puzzle.title)
		return "挑战 " + str(boss.name) + "；观察地面预告，闪避后反击"
	for puzzle in Puzzles.definitions():
		if puzzle.map_id == map_id and puzzle.required and not _puzzle_complete(str(puzzle.id)):
			return "解开灯光机关：" + str(puzzle.title)
	if map_id == Data.map_count() - 1:
		return "灯塔已经重新点亮。林恩找到了回家的路。"
	return "前往地图出口，继续下一段旅程"


func quest_log() -> Array[Dictionary]:
	var progress := objective_progress()
	var result: Array[Dictionary] = [{"id": "main", "title": str(_map.get("name", "旅程")), "description": objective_text(), "completed": _map_complete(), "progress": progress.x, "total": progress.y}]
	for quest in Data.side_quests():
		var count := 0
		for object_id in quest.object_ids:
			if flags.get("object:" + str(object_id), false):
				count += 1
		var description: String = quest.description
		if quest.get("mechanic", "") == "ledger_choice" and count == quest.object_ids.size() and not flags.get("quest:" + str(quest.id), false):
			description += "\n账页已齐：向阿芙核对留在当地的灯数。"
		result.append({"id": quest.id, "title": quest.title, "description": description, "completed": bool(flags.get("quest:" + str(quest.id), false)), "progress": count, "total": quest.object_ids.size()})
	return result


func journal_records() -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for info in Data.maps():
		var recorded_map_id := int(info.id)
		var recorded_map_name := str(info.name)
		for scene_kind in ["intro", "outro"]:
			var scene_id := "scene:" + str(scene_kind) + ":" + str(recorded_map_id)
			if not flags.get(scene_id, false):
				continue
			var scene_lines: Array[String] = []
			for line in info.get(scene_kind, []):
				scene_lines.append(str(line))
			if not scene_lines.is_empty():
				result.append({"id": scene_id, "title": recorded_map_name + (" · 初见" if scene_kind == "intro" else " · 归灯回响"), "map_id": recorded_map_id, "map_name": recorded_map_name, "lines": scene_lines})
		for object in info.objects:
			var record_id := "object:" + str(object.id)
			if object.type == "camp" or not flags.get(record_id, false):
				continue
			var record_lines: Array[String] = []
			for line in object.get("text", []):
				record_lines.append(str(line))
			if not record_lines.is_empty():
				result.append({"id": record_id, "title": str(object.title), "map_id": recorded_map_id, "map_name": recorded_map_name, "lines": record_lines})
	return result


func update(direction: Vector2, delta: float) -> void:
	if status != "playing" or not direction.is_finite() or not is_finite(delta) or delta <= 0.0:
		return
	var input := direction.limit_length(1.0)
	if not input.is_zero_approx() and dash_for <= 0.0:
		last_direction = input.normalized()
	var old_position := player_position
	var remaining := minf(delta, MAX_DELTA)
	while remaining > 0.000001 and status == "playing":
		var dt := minf(remaining, STEP)
		remaining -= dt
		elapsed += dt
		_tick_timers(dt)
		var dash_dt := minf(dash_for, dt)
		if dash_dt > 0.0:
			_move(_dash_direction * 9.0 * dash_dt)
		dash_for = maxf(0.0, dash_for - dt)
		_move(input * PLAYER_SPEED * (0.6 if slow_for > 0.0 else 1.0) * (dt - dash_dt))
		_update_enemies(dt)
		_update_boss(dt)
		_update_projectiles(dt)
		_update_hazards(dt)
		if _light_delay <= 0.0:
			var regen := 8.0 if _in_combat() else 14.0
			regen *= _charm_effect("energy_regen_multiplier", 1.0)
			light = minf(max_light, light + regen * dt)
	moving = status == "playing" and old_position.distance_squared_to(player_position) > 0.000001


func attack() -> bool:
	if status != "playing" or attack_cooldown > 0.000001:
		return false
	_combo = (_combo % 3) + 1 if _combo_window > 0.0 else 1
	_combo_window = 0.8
	attack_for = 0.18
	attack_cooldown = 0.38 if _combo < 3 else 0.48
	var damage := 25 if _combo == 3 else 18
	for enemy in enemies:
		if enemy.alive and enemy.visible and _sword_hits(enemy.position):
			var actual_damage := damage
			if enemy.behavior == "guard" and enemy.phase not in ["recover", "attack"] and enemy.facing.dot((player_position - enemy.position).normalized()) > 0.25:
				actual_damage = 5
			_hurt_enemy(enemy, actual_damage)
	if not boss.is_empty() and boss.health > 0 and boss.state != "dormant" and _sword_hits(boss.position):
		_hurt_boss(damage)
	_event("attack")
	return true


func dash(direction: Vector2) -> bool:
	if status != "playing" or dash_cooldown > 0.000001 or not direction.is_finite():
		return false
	var heading := last_direction if direction.is_zero_approx() else direction.normalized()
	if not heading.is_finite() or heading.is_zero_approx():
		return false
	_dash_direction = heading
	last_direction = heading
	dash_for = 0.18
	dash_cooldown = 0.9 * _charm_effect("dodge_cooldown_multiplier", 1.0)
	invulnerable_for = maxf(invulnerable_for, 0.16)
	_event("dash")
	return true


func pulse() -> bool:
	if status != "playing" or "pulse" not in abilities or light < 25.0 or pulse_cooldown > 0.000001:
		return false
	light -= 25.0
	_light_delay = 1.0
	pulse_for = 0.3
	pulse_cooldown = 6.0 * _charm_effect("pulse_cooldown_multiplier", 1.0)
	for enemy in enemies:
		if enemy.alive and player_position.distance_to(enemy.position) <= 1.8:
			enemy.visible = true
			_hurt_enemy(enemy, 30)
			if enemy.alive:
				enemy.phase = "recover"
				enemy.phase_time = 0.6
	if not boss.is_empty() and boss.health > 0 and boss.state != "dormant" and player_position.distance_to(boss.position) <= 1.8:
		if boss.type == "root_heart" and boss.phase_index == 1:
			_expose_boss(5.0)
		_hurt_boss(30)
	_event("pulse")
	return true


func lantern() -> bool:
	if status != "playing":
		return false
	lantern_for = 8.0
	_event("lantern")
	_notify("铜灯照亮了痕迹。靠近发光物件，按交互调查。")
	return true


func shield() -> bool:
	if status != "playing" or "shield" not in abilities or light < 35.0 or shield_cooldown > 0.000001:
		return false
	light -= 35.0
	_light_delay = 1.0
	shield_for = 1.0
	shield_cooldown = 12.0
	_shield_strength = 40.0 + _charm_effect("shield_bonus", 0.0)
	_event("shield")
	return true


func use_potion() -> bool:
	if status != "playing" or potions <= 0 or health >= max_health:
		return false
	potions -= 1
	health = mini(max_health, health + 40 + int(_charm_effect("healing_bonus", 0.0)))
	_event("heal")
	_notify("恢复了一缕微光。")
	return true


func interact() -> bool:
	if status != "playing":
		return false
	var node_result := _interact_boss_node()
	if node_result >= 0:
		return node_result == 1
	var nearest: Dictionary = {}
	var nearest_distance := 1.8
	for object in objects:
		var distance: float = player_position.distance_to(object.position)
		if distance < nearest_distance and (not object.completed or object.type in ["npc", "camp", "note"] or object.has("tone") or not str(object.get("npc_key", "")).is_empty()):
			nearest = object
			nearest_distance = distance
	if nearest.is_empty():
		if player_position.distance_to(_map.exit) <= 2.0:
			if map_id < Data.map_count() - 1:
				return travel(map_id + 1)
		_notify(objective_text())
		return false
	if nearest.type == "puzzle":
		status = "paused"
		moving = false
		_event("puzzle:" + str(nearest.puzzle_id))
		return true
	var ability: String = nearest.get("ability", "")
	if not ability.is_empty() and ability not in abilities:
		_notify("这里需要灯的能力：" + ability)
		return false
	if ability in ["lens", "echo"] and lantern_for <= 0.0:
		_notify("举起铜灯，才能看见这处机关的真实痕迹。")
		return false
	if ability == "pulse" and pulse_for <= 0.0:
		_notify("向机关释放光脉冲，再趁共鸣仍在时交互。")
		return false
	if ability == "shield" and shield_for <= 0.0:
		_notify("先张开守夜护罩，再靠近共鸣的机关交互。")
		return false
	if nearest.type in ["lamp", "anchor"] and lantern_for <= 0.0:
		_notify("先举起铜灯，再观察这处机关。")
		return false
	if nearest.type == "rune" and int(nearest.get("order", 0)) > 0:
		for object in objects:
			if object.type == "rune" and int(object.get("order", 0)) > 0 and int(object.order) < int(nearest.order) and not object.completed:
				_notify("符文还没有连通。沿亮起的痕迹按顺序连接。")
				return false
	if nearest.has("tone") and ("echo" not in abilities or lantern_for <= 0.0):
		_notify("先让回响灯芯与举起的铜灯回应这盏音灯。")
		return false
	if nearest.type == "camp":
		flags["object:" + str(nearest.id)] = true
		nearest.completed = true
		checkpoint_map = map_id
		checkpoint_position = nearest.position
		health = max_health
		light = max_light
		potions = maxi(potions, 3 if difficulty == "story" else 1)
		_event("save")
		_event("camp")
		_notify("篝火已记录旅程。生命与灯能恢复了。")
		return true
	_complete_object(nearest)
	if nearest.has("tone"):
		_play_tone_object(nearest)
	if nearest.type == "npc" and nearest.get("npc_key", "") == "afu":
		_event("shop")
	var lines: Array = nearest.get("text", [])
	if not lines.is_empty():
		_open_dialogue(_object_speaker(nearest), lines)
	if nearest.get("npc_key", "") == "afu":
		_offer_ledger_choice()
	_maybe_outro()
	return true


func next_dialogue() -> void:
	if status != "dialogue":
		return
	if dialogue_index == dialogue_lines.size() - 1 and not dialogue_choices.is_empty():
		return
	dialogue_index += 1
	if dialogue_index >= dialogue_lines.size():
		status = _dialogue_return
		if not _dialogue_scene_id.is_empty():
			flags[_dialogue_scene_id] = true
			_event("save")
		dialogue_lines.clear()
		dialogue_index = 0
		if status == "won":
			flags["ending_seen"] = true
			_event("win")
			_event("save")
		if not _dialogue_queue.is_empty():
			_start_dialogue(_dialogue_queue.pop_front())


func choose_choice(id: String) -> bool:
	if status != "dialogue" or dialogue_index != dialogue_lines.size() - 1 or _choice_quest_id.is_empty():
		return false
	var valid := false
	for choice in dialogue_choices:
		if choice.id == id:
			valid = true
	if not valid:
		return false
	for quest in Data.side_quests():
		if quest.id != _choice_quest_id:
			continue
		if id == quest.get("correct_choice", ""):
			_finish_quest(quest)
			dialogue_choices.clear()
			_choice_quest_id = ""
			dialogue_lines.assign([str(quest.get("correct_text", "阿芙：数目对上了，你没有把离乡的灯算作留下。"))])
		else:
			dialogue_lines.assign([str(quest.get("incorrect_text", "阿芙：再把留在街上的与送回工坊的分开看看。账页可以重新读。"))])
		dialogue_index = 0
		return true
	return false


func toggle_pause() -> void:
	if status == "playing":
		status = "paused"
		moving = false
	elif status == "paused":
		status = "playing"
		_maybe_outro()


func puzzle_action(id: String, action: Dictionary) -> bool:
	var definition: Dictionary = Puzzles.definition(id)
	if status != "paused" or definition.is_empty() or int(definition.map_id) != map_id or player_position.distance_to(definition.position) > 2.2 or flags.get("puzzle:" + id, false):
		return false
	var state: Dictionary = puzzle_states.get(id, Puzzles.initial_state(id))
	if not Puzzles.is_state_valid(id, state):
		return false
	var next: Dictionary = Puzzles.apply_action(id, state, action)
	if not Puzzles.is_state_valid(id, next) or next == state:
		return false
	puzzle_states[id] = next
	if Puzzles.is_solved(id, next):
		flags["puzzle:" + id] = true
		coins += int(definition.reward_coins)
		_recalculate_max_health()
		for object in objects:
			if object.get("puzzle_id", "") == id:
				object.completed = true
		_notify("" + str(definition.title) + "重新亮起来了。")
		_event("collect")
		_event("puzzle_solved")
	_event("save")
	return true


func can_travel(target_id: int) -> bool:
	if target_id < 0 or target_id >= Data.map_count() or target_id == map_id or status not in ["playing", "paused"]:
		return false
	var by_exit: bool = player_position.distance_to(_map.exit) <= 2.2
	var by_camp: bool = player_position.distance_to(_map.camp) <= 2.2
	if flags.get("visited:" + str(target_id), false):
		return by_exit or by_camp
	var outro_seen: bool = _map.get("outro", []).is_empty() or flags.get("scene:outro:" + str(map_id), false)
	return target_id == map_id + 1 and by_exit and _map_complete() and outro_seen


func travel(target_id: int) -> bool:
	if not can_travel(target_id):
		_notify("先完成本区目标，并前往出口或已点亮的篝火。")
		return false
	_clear_transient()
	_enter_map(target_id)
	checkpoint_map = target_id
	checkpoint_position = _map.camp if _standable(_map.camp) else player_position
	status = "playing"
	invulnerable_for = 1.0
	_event("travel")
	_event("save")
	_notify(str(_map.name) + "  ·  " + objective_text())
	_request_intro()
	return true


func retry() -> void:
	if status != "lost":
		return
	_clear_transient()
	_enter_map(checkpoint_map)
	player_position = checkpoint_position if _standable(checkpoint_position) else _map.spawn
	health = max_health
	light = max_light
	potions = maxi(potions, 3 if difficulty == "story" else 1)
	invulnerable_for = 1.5
	status = "playing"
	_event("save")
	_notify("篝火仍在等待。任务与永久收集都保留了。")


func continue_exploring() -> bool:
	if status != "won" or not flags.get("ending_seen", false):
		return false
	_clear_transient()
	_enter_map(Data.map_count() - 1)
	checkpoint_map = map_id
	checkpoint_position = _map.camp if _standable(_map.camp) else _map.spawn
	player_position = checkpoint_position
	health = max_health
	light = max_light
	invulnerable_for = 1.5
	status = "playing"
	_event("save")
	_notify("灯塔仍在发光。可以返回村庄，继续尚未完成的约定。")
	return true


func buy(item_id: String) -> bool:
	if status not in ["playing", "paused", "dialogue"] or not _near_shop():
		_notify("请在村庄商人阿芙身边购买。")
		return false
	if item_id == "potion":
		if coins < 8 or potions >= 3:
			return false
		coins -= 8
		potions += 1
	else:
		var item := _charm(item_id)
		if item.is_empty() or item_id in owned_charms or coins < int(item.price):
			return false
		coins -= int(item.price)
		owned_charms.append(item_id)
	_event("save")
	_notify("购买完成。")
	return true


func equip(charm_id: String, slot: int = -1) -> bool:
	if status not in ["playing", "paused"] or (not charm_id.is_empty() and charm_id not in owned_charms):
		return false
	if player_position.distance_to(_map.camp) > 2.2:
		_notify("在篝火附近整理护符。")
		return false
	if slot < -1 or slot > 1:
		return false
	if equipped_charms.size() != 2:
		equipped_charms.assign(["", ""])
	if slot == -1:
		slot = equipped_charms.find("")
		if slot < 0:
			slot = _selected_charm_slot
	if not charm_id.is_empty() and charm_id in equipped_charms:
		equipped_charms[equipped_charms.find(charm_id)] = ""
	equipped_charms[slot] = charm_id
	_selected_charm_slot = slot
	equipped_charm = charm_id
	if equipped_charm.is_empty():
		for active in equipped_charms:
			if not active.is_empty():
				equipped_charm = active
	_recalculate_max_health()
	_event("save")
	return true


func save_data() -> Dictionary:
	# Saves contain permanent progress and a safe checkpoint, never live attacks.
	var safe_map := checkpoint_map
	var safe_position := checkpoint_position
	var unsafe := _in_combat() or status == "lost"
	if not unsafe and status in ["playing", "paused", "dialogue", "won"] and _standable(player_position):
		safe_map = map_id
		safe_position = player_position
	return {"version": 1, "campaign_version": 3, "map_id": safe_map,
		"position": [safe_position.x, safe_position.y], "checkpoint_map": checkpoint_map,
		"checkpoint_position": [checkpoint_position.x, checkpoint_position.y],
		"health": max_health if unsafe else maxi(1, health), "light": max_light if unsafe else light, "coins": coins, "potions": potions,
		"elapsed": elapsed, "difficulty": difficulty, "flags": flags.duplicate(true),
		"abilities": abilities.duplicate(), "owned_charms": owned_charms.duplicate(),
		"equipped_charm": equipped_charm, "equipped_charms": equipped_charms.duplicate(), "puzzle_states": puzzle_states.duplicate(true)}


func load_data(data: Dictionary) -> bool:
	var candidate := data.duplicate(true)
	if _integer(candidate.get("campaign_version"), 1, 1):
		candidate.campaign_version = 2
		candidate.equipped_charms = [candidate.get("equipped_charm", ""), ""]
	if _integer(candidate.get("campaign_version"), 2, 2):
		candidate.campaign_version = 3
		candidate.puzzle_states = {}
		for puzzle in Puzzles.definitions():
			candidate.puzzle_states[puzzle.id] = Puzzles.initial_state(str(puzzle.id))
			if typeof(candidate.get("flags")) == TYPE_DICTIONARY and (candidate.flags.get("visited:" + str(int(puzzle.map_id) + 1), false) or (int(puzzle.map_id) == 14 and candidate.flags.get("ending", false))):
				candidate.flags["puzzle_legacy:" + str(puzzle.id)] = true
	if not _valid_save(candidate):
		return false
	data = candidate
	flags = data.flags.duplicate(true)
	puzzle_states = data.puzzle_states.duplicate(true)
	abilities.assign(data.abilities)
	owned_charms.assign(data.owned_charms)
	equipped_charm = data.equipped_charm
	equipped_charms.assign(data.equipped_charms)
	difficulty = data.difficulty
	coins = int(data.coins)
	potions = int(data.potions)
	elapsed = float(data.elapsed)
	checkpoint_map = int(data.checkpoint_map)
	checkpoint_position = Vector2(float(data.checkpoint_position[0]), float(data.checkpoint_position[1]))
	_recalculate_max_health()
	health = mini(max_health, int(data.health))
	light = float(data.light)
	_clear_transient()
	_enter_map(int(data.map_id))
	player_position = Vector2(float(data.position[0]), float(data.position[1]))
	status = "playing"
	if flags.get("ending", false):
		if not flags.get("ending_seen", false):
			_open_dialogue("岑灯", Data.map_data(Data.map_count() - 1).get("outro", []), "won", "scene:outro:14")
		else:
			status = "playing"
	else:
		_request_intro()
		_maybe_outro()
	invulnerable_for = 1.5
	_notify("已从安全记录继续旅程。")
	return true


func _enter_map(id: int) -> void:
	_map = Data.map_data(id)
	map_id = id
	map_revision += 1
	player_position = _map.get("spawn", Vector2.ZERO)
	flags["visited:" + str(id)] = true
	objects.clear()
	for item in _map.get("objects", []):
		var object: Dictionary = item.duplicate(true)
		object.completed = bool(flags.get("object:" + str(object.id), false))
		objects.append(object)
	for puzzle in Puzzles.definitions():
		if int(puzzle.map_id) != id:
			continue
		if puzzle.id not in puzzle_states:
			puzzle_states[puzzle.id] = Puzzles.initial_state(str(puzzle.id))
		objects.append({"id": puzzle.id, "type": "puzzle", "puzzle_id": puzzle.id, "position": puzzle.position, "title": puzzle.title, "text": [], "completed": _puzzle_complete(str(puzzle.id))})
	enemies.clear()
	for item in _map.get("enemies", []):
		var definition: Dictionary = Data.enemy_data(str(item.type))
		var enemy: Dictionary = item.duplicate(true)
		enemy.merge(definition)
		enemy.type = item.type
		enemy.health = int(definition.get("health", 50))
		enemy.max_health = enemy.health
		enemy.alive = true
		enemy.phase = "hidden" if enemy.behavior == "ambush" else "patrol"
		enemy.telegraph_for = 0.0
		enemy.phase_time = 0.0
		enemy.hit_for = 0.0
		enemy.attack_radius = float(definition.get("range", 1.5))
		enemy.attack_target = item.position
		enemy.attack_origin = item.position
		enemy.did_hit = false
		enemy.home = item.position
		enemy.facing = Vector2.RIGHT
		enemy.visible = enemy.behavior != "ambush"
		enemy.orbit_angle = float(abs(str(enemy.id).hash()) % 628) * 0.01
		enemy.orbit_time = 0.0
		enemy.combo_step = 0
		enemy.fan_angle = 0.32
		enemy.projectile_width = 0.43
		enemy.projectiles_spawned = false
		enemy.web_spawned = false
		enemies.append(enemy)
	boss = _map.get("boss", {}).duplicate(true)
	if not boss.is_empty():
		boss.max_health = int(boss.health)
		boss.state = "defeated" if flags.get("boss:" + str(boss.id), false) else "dormant"
		boss.health = 0 if boss.state == "defeated" else int(boss.max_health)
		boss.telegraph_for = 0.0
		boss.phase_time = 0.0
		boss.radius = 2.7
		boss.attack_target = boss.position
		boss.attack_origin = boss.position
		boss.pattern = "ring"
		boss.cycle = 0
		boss.did_hit = false
		boss.phase_index = 1
		boss.exposure_for = 0.0
		boss.transition_for = 0.0
		boss.shielded = boss.type in ["rune_colossus", "root_heart"] and boss.health > 0
		boss.node_round = 0
		boss.node_progress = 0
		boss.sub_attack = 0
		boss.charge_direction = Vector2.ZERO
		boss.charge_distance = 0.0
		boss.charge_remaining = 0.0
		boss.home = boss.position
		boss.puzzle_nodes = []
		if boss.type in ["rune_colossus", "root_heart"]:
			for index in range(3):
				var offset: Vector2 = [Vector2(-5, 0), Vector2(0, 5), Vector2(5, 0)][index]
				var authored_nodes: Array = boss.get("mechanics", {}).get("nodes", [])
				var authored: Dictionary = authored_nodes[index] if authored_nodes.size() == 3 else {}
				var glyph: String = authored.get("glyph", "")
				var title: String = {"shore": "岸纹", "archive": "库纹", "return": "回流纹" if boss.type == "root_heart" else "返纹", "core": "灯芯纹", "branch": "外根纹"}.get(glyph, ["岸纹", "库纹", "返纹"][index])
				boss.puzzle_nodes.append({"id": authored.get("id", "boss_node_%d_%d" % [id, index]), "position": authored.get("position", boss.position + offset), "active": false, "completed": false, "visible": true, "index": index, "title": title, "glyph": glyph})
		_refresh_boss_nodes()
		_refresh_boss_hint()
	else:
		boss_phase_text = ""


func _clear_transient() -> void:
	attack_for = 0.0
	dash_for = 0.0
	pulse_for = 0.0
	shield_for = 0.0
	lantern_for = 0.0
	attack_cooldown = 0.0
	dash_cooldown = 0.0
	pulse_cooldown = 0.0
	shield_cooldown = 0.0
	invulnerable_for = 0.0
	_shield_strength = 0.0
	_light_delay = 0.0
	_combo = 0
	_combo_window = 0.0
	moving = false
	last_direction = Vector2.RIGHT
	dialogue_lines.clear()
	dialogue_index = 0
	dialogue_speaker = ""
	dialogue_choices.clear()
	_choice_quest_id = ""
	_tone_index = 0
	_dialogue_scene_id = ""
	_dialogue_queue.clear()
	projectiles.clear()
	hazards.clear()
	slow_for = 0.0
	events.clear()


func _tick_timers(dt: float) -> void:
	attack_for = maxf(0.0, attack_for - dt)
	pulse_for = maxf(0.0, pulse_for - dt)
	shield_for = maxf(0.0, shield_for - dt)
	lantern_for = maxf(0.0, lantern_for - dt)
	invulnerable_for = maxf(0.0, invulnerable_for - dt)
	attack_cooldown = maxf(0.0, attack_cooldown - dt)
	dash_cooldown = maxf(0.0, dash_cooldown - dt)
	pulse_cooldown = maxf(0.0, pulse_cooldown - dt)
	shield_cooldown = maxf(0.0, shield_cooldown - dt)
	_light_delay = maxf(0.0, _light_delay - dt)
	_combo_window = maxf(0.0, _combo_window - dt)
	slow_for = maxf(0.0, slow_for - dt)


func _move(displacement: Vector2) -> void:
	var bounds: Rect2 = _map.bounds
	var minimum := bounds.position + Vector2.ONE * PLAYER_RADIUS
	var maximum := bounds.end - Vector2.ONE * PLAYER_RADIUS
	var next := player_position
	next.x = clampf(next.x + displacement.x, minimum.x, maximum.x)
	if _standable(next):
		player_position = next
	next = player_position
	next.y = clampf(next.y + displacement.y, minimum.y, maximum.y)
	if _standable(next):
		player_position = next


func _standable(point: Vector2, info: Dictionary = {}) -> bool:
	var source: Dictionary = _map if info.is_empty() else info
	var bounds: Rect2 = source.bounds
	if not point.is_finite() or point.x < bounds.position.x + PLAYER_RADIUS or point.y < bounds.position.y + PLAYER_RADIUS or point.x > bounds.end.x - PLAYER_RADIUS or point.y > bounds.end.y - PLAYER_RADIUS:
		return false
	for tree in source.get("trees", []):
		if point.distance_to(tree) < PLAYER_RADIUS + 0.48:
			return false
	for obstacle in source.get("obstacles", []):
		if point.distance_to(obstacle.position) < PLAYER_RADIUS + float(obstacle.radius):
			return false
	return true


func _sword_hits(point: Vector2) -> bool:
	var offset := point - player_position
	return offset.length() <= 1.5 and (offset.is_zero_approx() or offset.normalized().dot(last_direction) >= 0.5)


func _update_enemies(dt: float) -> void:
	for enemy in enemies:
		enemy.hit_for = maxf(0.0, float(enemy.hit_for) - dt)
		if not enemy.alive:
			continue
		var distance: float = enemy.position.distance_to(player_position)
		match str(enemy.phase):
			"hidden":
				if (lantern_for > 0.0 and distance <= 4.0) or distance <= 1.6:
					enemy.visible = true
					_enemy_telegraph(enemy, float(enemy.windup) + (0.35 if lantern_for <= 0.0 else 0.0))
			"patrol":
				if distance < 8.0:
					var desired_facing: Vector2 = (player_position - enemy.position).normalized()
					if not desired_facing.is_zero_approx():
						enemy.facing = enemy.facing.slerp(desired_facing, minf(1.0, dt * 1.5)).normalized()
					if enemy.behavior == "orbit" and distance > 0.8 and float(enemy.orbit_time) < 1.2:
						enemy.orbit_angle += dt * 1.8
						enemy.orbit_time += dt
						var orbit_target: Vector2 = player_position + Vector2(cos(enemy.orbit_angle), sin(enemy.orbit_angle)) * 1.7
						enemy.position = enemy.position.move_toward(orbit_target, float(enemy.speed) * 1.5 * dt)
						var orbit_bounds: Rect2 = _map.bounds
						enemy.position = enemy.position.clamp(orbit_bounds.position + Vector2.ONE * 0.4, orbit_bounds.end - Vector2.ONE * 0.4)
						continue
					var range_limit := 1.55
					if enemy.behavior in ["ranged", "fan"]:
						range_limit = 7.0
					elif enemy.behavior == "charge":
						range_limit = 5.0
					elif enemy.behavior in ["root", "web", "stomp"]:
						range_limit = 3.0
					if distance <= range_limit:
						enemy.combo_step = 1
						_enemy_telegraph(enemy, float(enemy.windup))
					else:
						enemy.position = enemy.position.move_toward(player_position, float(enemy.speed) * dt)
			"telegraph":
				enemy.telegraph_for = maxf(0.0, float(enemy.telegraph_for) - dt)
				if enemy.telegraph_for <= 0.000001:
					enemy.phase = "attack"
					enemy.phase_time = 0.28
			"attack":
				if enemy.behavior in ["ranged", "fan"] and not enemy.projectiles_spawned:
					enemy.projectiles_spawned = true
					_spawn_enemy_projectiles(enemy)
				if enemy.behavior == "web" and not enemy.web_spawned:
					enemy.web_spawned = true
					hazards.append({"type": "web", "position": enemy.attack_target, "radius": 1.3, "remaining": 3.0})
				if enemy.behavior == "charge":
					enemy.position = enemy.position.move_toward(enemy.attack_target, 10.0 * dt)
				if enemy.behavior not in ["ranged", "fan"] and not enemy.did_hit and _enemy_attack_hits(enemy):
					enemy.did_hit = true
					_take_damage(int(enemy.damage))
				enemy.phase_time -= dt
				if enemy.phase_time <= 0.0:
					if enemy.behavior == "combo" and enemy.combo_step == 1:
						enemy.combo_step = 2
						_enemy_telegraph(enemy, 0.65)
					else:
						enemy.phase = "recover"
						enemy.phase_time = 1.0
			"recover":
				enemy.phase_time -= dt
				if enemy.phase_time <= 0.0:
					enemy.phase = "hidden" if enemy.behavior == "ambush" and distance > 3.0 and lantern_for <= 0.0 else "patrol"
					enemy.visible = enemy.phase != "hidden"
					enemy.orbit_time = 0.0
		var bounds: Rect2 = _map.bounds
		enemy.position = enemy.position.clamp(bounds.position + Vector2.ONE * 0.4, bounds.end - Vector2.ONE * 0.4)


func _enemy_telegraph(enemy: Dictionary, duration: float) -> void:
	enemy.phase = "telegraph"
	enemy.telegraph_for = duration + (0.2 if difficulty == "story" else 0.0)
	enemy.attack_target = player_position
	enemy.attack_origin = enemy.position
	enemy.facing = (player_position - enemy.position).normalized()
	enemy.did_hit = false
	enemy.projectiles_spawned = false
	enemy.web_spawned = false


func _spawn_enemy_projectiles(enemy: Dictionary) -> void:
	var direction: Vector2 = (enemy.attack_target - enemy.attack_origin).normalized()
	if direction.is_zero_approx():
		direction = Vector2.RIGHT
	var angles: Array = [-0.32, 0.0, 0.32] if enemy.behavior == "fan" else [0.0]
	for angle in angles:
		projectiles.append({"position": enemy.attack_origin, "direction": direction.rotated(float(angle)), "speed": 8.0, "remaining": 1.0, "radius": 0.18, "damage": int(enemy.damage), "owner": enemy.id})


func _update_projectiles(dt: float) -> void:
	for index in range(projectiles.size() - 1, -1, -1):
		var projectile: Dictionary = projectiles[index]
		projectile.position += projectile.direction * projectile.speed * dt
		projectile.remaining -= dt
		if projectile.remaining <= 0.0 or not _standable(projectile.position):
			projectiles.remove_at(index)
		elif projectile.position.distance_to(player_position) <= float(projectile.radius) + PLAYER_RADIUS:
			_take_damage(int(projectile.damage))
			projectiles.remove_at(index)


func _update_hazards(dt: float) -> void:
	for index in range(hazards.size() - 1, -1, -1):
		var hazard: Dictionary = hazards[index]
		hazard.remaining -= dt
		if hazard.remaining <= 0.0:
			hazards.remove_at(index)
		elif player_position.distance_to(hazard.position) <= float(hazard.radius):
			slow_for = maxf(slow_for, 0.2)


func _enemy_attack_hits(enemy: Dictionary) -> bool:
	match str(enemy.behavior):
		"ranged", "fan":
			return false # Their visible projectiles resolve collision while travelling.
		"root", "web", "ambush":
			return player_position.distance_to(enemy.attack_target) <= 1.3
		"stomp":
			return player_position.distance_to(enemy.position) <= 2.3
		"charge":
			return player_position.distance_to(enemy.position) <= 0.9
		"guard", "combo":
			var offset: Vector2 = player_position - enemy.position
			return offset.length() <= 1.8 and (offset.is_zero_approx() or offset.normalized().dot(enemy.facing) >= 0.3)
	return player_position.distance_to(enemy.position) <= 1.6


func _line_hits(origin: Vector2, target: Vector2, length: float, width: float) -> bool:
	var direction := (target - origin).normalized()
	if direction.is_zero_approx():
		return player_position.distance_to(origin) <= width
	var offset := player_position - origin
	var distance := offset.dot(direction)
	return distance >= -0.3 and distance <= length and absf(offset.cross(direction)) <= width


func _update_boss(dt: float) -> void:
	if boss.is_empty() or boss.health <= 0:
		return
	if boss.transition_for > 0.0:
		boss.transition_for = maxf(0.0, float(boss.transition_for) - dt)
		if boss.transition_for <= 0.0:
			_boss_telegraph()
		return
	if boss.exposure_for > 0.0:
		boss.exposure_for = maxf(0.0, float(boss.exposure_for) - dt)
		if boss.exposure_for <= 0.0:
			boss.shielded = true
			boss.node_progress = 0
			for node in boss.puzzle_nodes:
				node.completed = false
			_refresh_boss_nodes()
			_refresh_boss_hint()
	if boss.state == "dormant":
		if _required_complete() and player_position.distance_to(boss.position) <= 7.0:
			_boss_telegraph()
			_refresh_boss_nodes()
			_notify("" + str(boss.name) + "醒来了。观察预告，再寻找反击空档。")
		return
	if boss.state == "telegraph":
		boss.telegraph_for = maxf(0.0, float(boss.telegraph_for) - dt)
		if boss.telegraph_for <= 0.000001:
			boss.state = "attack"
			boss.phase_time = maxf(0.3, float(boss.charge_distance) / 12.0) if boss.pattern == "charge" else 0.3
			boss.did_hit = false
	elif boss.state == "attack":
		var hit := false
		if boss.pattern == "charge":
			var movement := minf(float(boss.charge_remaining), 12.0 * dt)
			boss.position += boss.charge_direction * movement
			if boss.position.distance_to(boss.home) > 6.0:
				boss.position = boss.home + (boss.position - boss.home).normalized() * 6.0
				boss.charge_remaining = 0.0
			boss.charge_remaining -= movement
			var bounds: Rect2 = _map.bounds
			boss.position = boss.position.clamp(bounds.position + Vector2.ONE, bounds.end - Vector2.ONE)
			hit = player_position.distance_to(boss.position) <= 1.1
		elif boss.pattern == "thrust":
			hit = _line_hits(boss.attack_origin, boss.attack_target, 5.0, 0.65)
		elif boss.pattern == "fan":
			var heading: Vector2 = (boss.attack_target - boss.attack_origin).normalized()
			for angle in [-0.4, 0.0, 0.4]:
				hit = hit or _line_hits(boss.attack_origin, boss.attack_origin + heading.rotated(angle), 10.0, 0.65)
		else:
			hit = player_position.distance_to(boss.attack_target) <= float(boss.radius)
		if hit and not boss.did_hit:
			boss.did_hit = true
			_take_damage(20 + int(_map.chapter) * 2)
		boss.phase_time -= dt
		if boss.phase_time <= 0.0:
			if boss.type == "night_warden" and boss.sub_attack == 1:
				boss.sub_attack = 2
				boss.state = "telegraph"
				boss.telegraph_for = 0.85 + (0.2 if difficulty == "story" else 0.0)
				boss.pattern = "thrust"
				boss.attack_origin = boss.position
				boss.attack_target = player_position
				boss.did_hit = false
				boss_phase_text = "第二段：看清枪尖锁定的方向，再侧身闪避。"
			else:
				boss.state = "recover"
				boss.phase_time = 2.2
	elif boss.state == "recover":
		boss.phase_time -= dt
		if boss.phase_time <= 0.0:
			_boss_telegraph()
	_refresh_boss_nodes()


func _boss_telegraph() -> void:
	boss.cycle += 1
	boss.state = "telegraph"
	boss.telegraph_for = 1.3 + (0.2 if difficulty == "story" else 0.0)
	boss.radius = 2.7 if boss.health > boss.max_health / 2 else 3.2
	boss.attack_origin = boss.position
	boss.attack_target = boss.position
	boss.pattern = "ring"
	boss.sub_attack = 0
	if boss.type == "mist_hunter":
		boss.pattern = "charge"
		boss.attack_target = player_position
		boss.charge_direction = (player_position - boss.position).normalized()
		boss.charge_distance = minf(5.0, boss.position.distance_to(player_position))
		boss.charge_remaining = boss.charge_distance
		boss.phase_time = maxf(0.3, boss.charge_distance / 12.0)
	elif boss.type == "night_warden":
		boss.sub_attack = 1
		boss.pattern = "sword"
		boss.radius = 2.1
	elif boss.type == "rune_colossus":
		boss.pattern = "rune"
		boss.attack_target = player_position
		boss.radius = 2.0
	elif boss.type == "root_heart" and int(boss.cycle) % 2 == 1:
		boss.pattern = "fan"
		boss.attack_target = player_position
	_refresh_boss_hint()


func _expose_boss(seconds: float) -> void:
	if boss.is_empty() or boss.health <= 0 or boss.state == "dormant" or boss.transition_for > 0.0:
		return
	boss.shielded = false
	boss.exposure_for = seconds
	if boss.type == "rune_colossus":
		boss.node_round += 1
	# Solving always grants a complete readable warning before the next attack.
	_boss_telegraph()
	boss.telegraph_for = 1.4 + (0.2 if difficulty == "story" else 0.0)
	_refresh_boss_nodes()
	_refresh_boss_hint()
	_event("puzzle_solved")


func _interact_boss_node() -> int:
	if boss.is_empty() or boss.health <= 0 or boss.state == "dormant" or boss.transition_for > 0.0 or not boss.shielded:
		return -1
	for node in boss.puzzle_nodes:
		if player_position.distance_to(node.position) > 1.8:
			continue
		if ((boss.type == "rune_colossus" or boss.phase_index == 2) and "echo" not in abilities) or lantern_for <= 0.0:
			_notify("举灯让回响显形，再辨认端点的纹样。")
			return 0
		if boss.type == "rune_colossus":
			if not node.active:
				_notify("回流还没到这里。循着岸、库、返的线索观察当前光纹。")
				return 0
			node.completed = true
			_expose_boss(6.0)
			return 1
		if boss.type == "root_heart" and boss.phase_index == 2:
			var sequence: Array = boss.get("mechanics", {}).get("node_order", [2, 0, 1])
			if int(node.index) != int(sequence[int(boss.node_progress)]):
				_notify("铜音没有接上。先辨认外根，让光经过回流，最后归入灯芯。")
				return 0
			node.completed = true
			boss.node_progress += 1
			if boss.node_progress >= 3:
				_expose_boss(7.0)
			else:
				_refresh_boss_nodes()
			return 1
		if boss.type == "root_heart" and boss.phase_index == 3:
			if "lens" not in abilities or lantern_for <= 0.0 or shield_for <= 0.0 or node.index != 1:
				_notify("透镜与灯会指出真实的灯芯纹；守住护罩，再稳定这处端点。")
				return 0
			node.completed = true
			_expose_boss(7.0)
			return 1
	return -1


func _refresh_boss_nodes() -> void:
	if boss.is_empty():
		return
	for node in boss.puzzle_nodes:
		node.active = false
		node.visible = true
		if boss.state == "dormant" or boss.health <= 0 or not boss.shielded or boss.transition_for > 0.0:
			continue
		if boss.type == "rune_colossus":
			node.active = node.index == int(boss.node_round) % 3
		elif boss.type == "root_heart" and boss.phase_index == 2:
			node.active = not node.completed
		elif boss.type == "root_heart" and boss.phase_index == 3:
			node.visible = "lens" in abilities and lantern_for > 0.0
			node.active = node.index == 1 and node.visible


func _refresh_boss_hint() -> void:
	if boss.is_empty() or boss.health <= 0:
		boss_phase_text = ""
		return
	if boss.exposure_for > 0.0:
		boss_phase_text = "护核敞开了！观察下一次预告，在空档攻击核心。"
	elif boss.type == "rune_colossus":
		boss_phase_text = "护核闭合：举灯追踪岸、库、返的轮流回响，连接发光端点。"
	elif boss.type == "root_heart":
		if boss.phase_index == 1:
			boss_phase_text = "根环：靠近结光，以光脉冲打开核心；先躲开根环的预告。"
		elif boss.phase_index == 2:
			boss_phase_text = "回流：举灯依外根、回流、灯芯连接三处纹样，再攻击敞开的核心。"
		else:
			boss_phase_text = "稳定：以透镜和举灯辨认真实灯芯纹，张开护罩后交互稳定。"
	elif boss.type == "mist_hunter":
		boss_phase_text = "巡猎者锁定冲刺路径后不会追踪；侧移闪避，待它停下再反击。"
	elif boss.type == "night_warden":
		boss_phase_text = "第一段剑扫之后仍有枪刺：分别观察两次预告，再寻找反击空档。"
	else:
		boss_phase_text = "退出震圈或在伤害落下前闪避；守卫恢复时靠近挥剑。"


func _take_damage(amount: int) -> void:
	if status != "playing" or invulnerable_for > 0.0:
		return
	var scaled := int(ceil(amount * (0.65 if difficulty == "story" else (1.25 if difficulty == "challenge" else 1.0))))
	if shield_for > 0.0:
		var absorbed := mini(scaled, int(_shield_strength))
		_shield_strength -= absorbed
		scaled -= absorbed
		if _shield_strength <= 0.0:
			shield_for = 0.0
			_event("shield_break")
	if scaled <= 0:
		_event("block")
		return
	health = maxi(0, health - scaled)
	invulnerable_for = 0.8
	_event("hurt")
	if health == 0:
		status = "lost"
		moving = false
		_notify("微光暂时沉睡。篝火会保留你的旅程。")
		_event("death")


func _hurt_enemy(enemy: Dictionary, damage: int) -> void:
	enemy.health = maxi(0, int(enemy.health) - damage)
	enemy.hit_for = 0.2
	if enemy.health == 0:
		enemy.alive = false
		enemy.phase = "dead"
		var key := "drop:" + str(enemy.id)
		if not flags.get(key, false):
			flags[key] = true
			coins += 3
		_event("enemy_defeated")


func _hurt_boss(damage: int) -> void:
	if boss.get("shielded", false) or boss.get("transition_for", 0.0) > 0.0:
		_event("block")
		return
	boss.health = maxi(0, int(boss.health) - damage)
	if boss.type == "root_heart" and boss.health > 0:
		var next_phase := 1 if boss.health > boss.max_health * 2.0 / 3.0 else (2 if boss.health > boss.max_health / 3.0 else 3)
		if next_phase != int(boss.phase_index):
			boss.phase_index = next_phase
			boss.shielded = true
			boss.exposure_for = 0.0
			boss.transition_for = 2.0
			boss.state = "transition"
			boss.node_progress = 0
			for node in boss.puzzle_nodes:
				node.completed = false
			_refresh_boss_nodes()
			_refresh_boss_hint()
	if boss.health > 0:
		return
	boss.state = "defeated"
	flags["boss:" + str(boss.id)] = true
	coins += 30
	var ability: String = boss.get("reward_ability", "")
	if not ability.is_empty() and ability not in abilities:
		abilities.append(ability)
	flags["growth:boss:" + str(boss.id)] = true
	_recalculate_max_health()
	health = max_health
	light = max_light
	_event("boss_defeated")
	_event("save")
	_notify(str(boss.name) + "已平静下来。古老的道路重新开启了。")
	if map_id == Data.map_count() - 1:
		flags["ending"] = true
	var outro: Array = _map.get("outro", [])
	if not outro.is_empty():
		_open_dialogue("岑灯" if map_id == Data.map_count() - 1 else "林恩", outro, "won" if map_id == Data.map_count() - 1 else "playing", "scene:outro:" + str(map_id))
	elif map_id == Data.map_count() - 1:
		status = "won"
		_event("win")


func _complete_object(object: Dictionary) -> void:
	var key := "object:" + str(object.id)
	if flags.get(key, false):
		return
	flags[key] = true
	object.completed = true
	var reward: Dictionary = object.get("reward", {})
	_apply_reward(reward)
	_check_side_quests()
	_event("interact")
	_event("save")
	_notify(str(object.get("title", "发现")) + "  ·  已记录")


func _apply_reward(reward: Dictionary) -> void:
	coins += int(reward.get("coins", 0))
	potions = mini(3, potions + int(reward.get("potions", 0)))
	var ability: String = reward.get("ability", "")
	if not ability.is_empty() and ability not in abilities:
		abilities.append(ability)
	var charm: String = reward.get("charm", "")
	if not charm.is_empty() and charm not in owned_charms:
		owned_charms.append(charm)
	_recalculate_max_health()


func _check_side_quests() -> void:
	for quest in Data.side_quests():
		if flags.get("quest:" + str(quest.id), false):
			continue
		if quest.get("mechanic", "") in ["ledger_choice", "tone_sequence"]:
			continue
		var complete := true
		for key in quest.object_ids:
			if not flags.get("object:" + str(key), false):
				complete = false
		if complete:
			_finish_quest(quest)


func _finish_quest(quest: Dictionary) -> void:
	var key := "quest:" + str(quest.id)
	if flags.get(key, false):
		return
	flags[key] = true
	_apply_reward({"coins": quest.get("reward_coins", 0), "charm": quest.get("reward_charm", "")})
	_event("quest_completed")
	_event("save")
	_notify(str(quest.title) + "  ·  支线完成")


func _play_tone_object(object: Dictionary) -> void:
	_event("tone_" + str(object.tone))
	for quest in Data.side_quests():
		if quest.get("mechanic", "") != "tone_sequence" or flags.get("quest:" + str(quest.id), false):
			continue
		var sequence: Array = quest.sequence
		if str(object.id) == str(sequence[_tone_index]):
			_tone_index += 1
			if _tone_index >= sequence.size():
				_finish_quest(quest)
				_tone_index = 0
			else:
				_notify("铜音接上了，再听下一段回响。")
		else:
			_tone_index = 1 if str(object.id) == str(sequence[0]) else 0
			_notify("音序未接通。可免费再试：从低音出发，越过高音，停在中音。")


func _offer_ledger_choice() -> void:
	for quest in Data.side_quests():
		if quest.get("mechanic", "") != "ledger_choice" or flags.get("quest:" + str(quest.id), false):
			continue
		var ready := true
		for id in quest.object_ids:
			if not flags.get("object:" + str(id), false):
				ready = false
		if ready:
			_open_dialogue("阿芙", [str(quest.question)], "playing", "", quest.choices, str(quest.id))


func _open_dialogue(speaker: String, lines: Array, return_state: String = "playing", scene_id: String = "", choices: Array = [], choice_quest: String = "") -> void:
	if lines.is_empty() or (not scene_id.is_empty() and flags.get(scene_id, false)):
		return
	var package := {"speaker": speaker, "lines": lines.duplicate(), "return": return_state, "scene": scene_id, "choices": choices.duplicate(true), "choice_quest": choice_quest}
	if status == "dialogue":
		if not scene_id.is_empty():
			if _dialogue_scene_id == scene_id:
				return
			for queued in _dialogue_queue:
				if queued.scene == scene_id:
					return
		_dialogue_queue.append(package)
	else:
		_start_dialogue(package)


func _start_dialogue(package: Dictionary) -> void:
	dialogue_lines.clear()
	for line in package.lines:
		dialogue_lines.append(str(line))
	dialogue_index = 0
	dialogue_speaker = package.speaker
	_dialogue_return = package["return"]
	_dialogue_scene_id = package.scene
	dialogue_choices.assign(package.get("choices", []))
	_choice_quest_id = package.get("choice_quest", "")
	status = "dialogue"
	moving = false


func _request_intro() -> void:
	_open_dialogue("林恩", _map.get("intro", []), "playing", "scene:intro:" + str(map_id))


func _maybe_outro() -> void:
	if _map_complete():
		_open_dialogue("岑灯" if map_id == 14 else "林恩", _map.get("outro", []), "won" if map_id == 14 else "playing", "scene:outro:" + str(map_id))


func _object_speaker(object: Dictionary) -> String:
	match str(object.get("npc_key", "")):
		"afu": return "阿芙"
		"xiaohe", "xiao_he": return "小禾"
		"cendeng", "cen_deng": return "岑灯"
	return str(object.get("title", "林恩"))


func _required_complete() -> bool:
	for key in _map.get("required", []):
		if not flags.get("object:" + str(key), false):
			return false
	for puzzle in Puzzles.definitions():
		if int(puzzle.map_id) == map_id and puzzle.required and not _puzzle_complete(str(puzzle.id)):
			return false
	return true


func _puzzle_complete(id: String) -> bool:
	return flags.get("puzzle:" + id, false) or flags.get("puzzle_legacy:" + id, false)


func _map_complete() -> bool:
	return _required_complete() and (boss.is_empty() or boss.health <= 0)


func _in_combat() -> bool:
	if not boss.is_empty() and boss.health > 0 and boss.state != "dormant":
		return true
	for enemy in enemies:
		if enemy.alive and player_position.distance_to(enemy.position) < 7.0:
			return true
	return false


func _near_shop() -> bool:
	for object in objects:
		if object.get("npc_key", "") == "afu" and player_position.distance_to(object.position) <= 3.5:
			return true
	return false


func _charm(id: String) -> Dictionary:
	for charm in Data.charms():
		if charm.id == id:
			return charm
	return {}


func _charm_effect(key: String, default_value: float) -> float:
	var value := default_value
	for id in equipped_charms:
		var effects: Dictionary = _charm(id).get("effect", {})
		if key in effects:
			if key.ends_with("_multiplier"):
				value *= float(effects[key])
			else:
				value += float(effects[key])
	return value


func _recalculate_max_health() -> void:
	max_health = _max_health_for(flags, equipped_charms)
	health = mini(health, max_health)
	max_light = _max_light_for(flags)
	light = minf(light, max_light)


func _max_light_for(progress: Dictionary) -> float:
	var value := 100.0
	for puzzle in Puzzles.definitions():
		if progress.get("puzzle:" + str(puzzle.id), false):
			value += int(puzzle.get("reward_light_growth", 0))
	return minf(110.0, value)


func _max_health_for(progress: Dictionary, charm_ids: Array) -> int:
	var growth := 0
	for info in Data.maps():
		var guardian: Dictionary = info.get("boss", {})
		if not guardian.is_empty() and progress.get("growth:boss:" + str(guardian.id), false):
			growth += 5
		for object in info.get("objects", []):
			if progress.get("object:" + str(object.id), false):
				growth += int(object.get("reward", {}).get("health_growth", 0))
	var bonus := 0
	for charm_id in charm_ids:
		bonus += int(_charm(str(charm_id)).get("effect", {}).get("max_health", 0))
	return mini(140, 100 + growth) + bonus


func _notify(text: String) -> void:
	toast = text
	toast_revision += 1


func _event(event: String) -> void:
	events.append(event)


func _valid_save(data: Dictionary) -> bool:
	if not _integer(data.get("version"), 1, 1) or not _integer(data.get("campaign_version"), 3, 3):
		return false
	if not _integer(data.get("map_id"), 0, Data.map_count() - 1) or not _integer(data.get("checkpoint_map"), 0, Data.map_count() - 1):
		return false
	if not _position_field(data.get("position"), int(data.map_id)) or not _position_field(data.get("checkpoint_position"), int(data.checkpoint_map)):
		return false
	if not _integer(data.get("health"), 1, 150) or not _number(data.get("light"), 0.0, 110.0) or not _integer(data.get("coins"), 0, 100000) or not _integer(data.get("potions"), 0, 3) or not _number(data.get("elapsed"), 0.0, 100000000.0):
		return false
	if typeof(data.get("difficulty")) != TYPE_STRING or data.difficulty not in DIFFICULTIES:
		return false
	if typeof(data.get("flags")) != TYPE_DICTIONARY or data.flags.size() > 2000:
		return false
	var valid_flags := _flag_catalogue()
	for key in data.flags:
		if typeof(key) != TYPE_STRING or key not in valid_flags or typeof(data.flags[key]) != TYPE_BOOL:
			return false
	if typeof(data.get("puzzle_states")) != TYPE_DICTIONARY or data.puzzle_states.size() != Puzzles.definitions().size():
		return false
	for puzzle in Puzzles.definitions():
		var id: String = puzzle.id
		if typeof(data.puzzle_states.get(id)) != TYPE_DICTIONARY or not Puzzles.is_state_valid(id, data.puzzle_states[id]):
			return false
		if bool(data.flags.get("puzzle:" + id, false)) != Puzzles.is_solved(id, data.puzzle_states[id]):
			return false
		if data.flags.get("puzzle_legacy:" + id, false) and not data.flags.get("visited:" + str(int(puzzle.map_id) + 1), false) and not (int(puzzle.map_id) == 14 and data.flags.get("ending", false)):
			return false
	if float(data.light) > _max_light_for(data.flags):
		return false
	if not _string_array(data.get("abilities"), ABILITY_IDS) or not _string_array(data.get("owned_charms"), _charm_ids()):
		return false
	if typeof(data.get("equipped_charm")) != TYPE_STRING or (not data.equipped_charm.is_empty() and data.equipped_charm not in data.owned_charms):
		return false
	if not _valid_charm_slots(data.get("equipped_charms"), data.owned_charms):
		return false
	if not data.equipped_charm.is_empty() and data.equipped_charm not in data.equipped_charms:
		return false
	if int(data.health) > _max_health_for(data.flags, data.equipped_charms):
		return false
	# Reject shortcuts and contradictory grants rather than repairing silently.
	if not data.flags.get("visited:" + str(int(data.map_id)), false) or not data.flags.get("visited:" + str(int(data.checkpoint_map)), false):
		return false
	for info in Data.maps():
		var guardian: Dictionary = info.get("boss", {})
		if data.flags.get("growth:boss:" + str(guardian.get("id", "")), false) != data.flags.get("boss:" + str(guardian.get("id", "")), false):
			return false
		if not guardian.is_empty() and data.flags.get("boss:" + str(guardian.id), false):
			for key in info.get("required", []):
				if not data.flags.get("object:" + str(key), false):
					return false
			var ability: String = guardian.get("reward_ability", "")
			if not ability.is_empty() and ability not in data.abilities:
				return false
			for puzzle in Puzzles.definitions():
				if int(puzzle.map_id) == int(info.id) and puzzle.required and not data.flags.get("puzzle:" + str(puzzle.id), false) and not data.flags.get("puzzle_legacy:" + str(puzzle.id), false):
					return false
		for object in info.get("objects", []):
			if data.flags.get("object:" + str(object.id), false):
				var required_ability: String = object.get("ability", "")
				var granted_ability: String = object.get("reward", {}).get("ability", "")
				if not required_ability.is_empty() and required_ability not in data.abilities:
					return false
				if not granted_ability.is_empty() and granted_ability not in data.abilities:
					return false
		if int(info.id) > 0 and data.flags.get("visited:" + str(info.id), false):
			var previous := Data.map_data(int(info.id) - 1)
			for key in previous.get("required", []):
				if not data.flags.get("object:" + str(key), false):
					return false
			var previous_boss: Dictionary = previous.get("boss", {})
			if not previous_boss.is_empty() and not data.flags.get("boss:" + str(previous_boss.id), false):
				return false
			for puzzle in Puzzles.definitions():
				if int(puzzle.map_id) == int(info.id) - 1 and puzzle.required and not data.flags.get("puzzle:" + str(puzzle.id), false) and not data.flags.get("puzzle_legacy:" + str(puzzle.id), false):
					return false
		if data.flags.get("scene:intro:" + str(info.id), false) and not data.flags.get("visited:" + str(info.id), false):
			return false
		if data.flags.get("scene:outro:" + str(info.id), false):
			for key in info.get("required", []):
				if not data.flags.get("object:" + str(key), false):
					return false
			if not guardian.is_empty() and not data.flags.get("boss:" + str(guardian.id), false):
				return false
			for puzzle in Puzzles.definitions():
				if int(puzzle.map_id) == int(info.id) and puzzle.required and not data.flags.get("puzzle:" + str(puzzle.id), false) and not data.flags.get("puzzle_legacy:" + str(puzzle.id), false):
					return false
	for quest in Data.side_quests():
		if data.flags.get("quest:" + str(quest.id), false):
			for key in quest.object_ids:
				if not data.flags.get("object:" + str(key), false):
					return false
			var reward_charm: String = quest.get("reward_charm", "")
			if not reward_charm.is_empty() and reward_charm not in data.owned_charms:
				return false
	var final_boss: Dictionary = Data.map_data(Data.map_count() - 1).get("boss", {})
	if bool(data.flags.get("ending", false)) != bool(data.flags.get("boss:" + str(final_boss.get("id", "")), false)):
		return false
	if data.flags.get("ending_seen", false) and not data.flags.get("ending", false):
		return false
	if bool(data.flags.get("ending_seen", false)) != bool(data.flags.get("scene:outro:14", false)):
		return false
	for ability in data.abilities:
		var earned := false
		for info in Data.maps():
			var guardian: Dictionary = info.get("boss", {})
			if guardian.get("reward_ability", "") == ability and data.flags.get("boss:" + str(guardian.get("id", "")), false):
				earned = true
			for object in info.get("objects", []):
				if object.get("reward", {}).get("ability", "") == ability and data.flags.get("object:" + str(object.id), false):
					earned = true
		if not earned:
			return false
	return true


func _flag_catalogue() -> Array[String]:
	var keys: Array[String] = ["ending", "ending_seen"]
	for info in Data.maps():
		keys.append("visited:" + str(info.id))
		keys.append("scene:intro:" + str(info.id))
		keys.append("scene:outro:" + str(info.id))
		for object in info.get("objects", []):
			keys.append("object:" + str(object.id))
		for enemy in info.get("enemies", []):
			keys.append("drop:" + str(enemy.id))
		var guardian: Dictionary = info.get("boss", {})
		if not guardian.is_empty():
			keys.append("boss:" + str(guardian.id))
			keys.append("growth:boss:" + str(guardian.id))
	for quest in Data.side_quests():
		keys.append("quest:" + str(quest.id))
	for puzzle in Puzzles.definitions():
		keys.append("puzzle:" + str(puzzle.id))
		keys.append("puzzle_legacy:" + str(puzzle.id))
	return keys


func _charm_ids() -> Array[String]:
	var result: Array[String] = []
	for charm in Data.charms():
		result.append(str(charm.id))
	return result


func _position_field(value: Variant, id: int) -> bool:
	if typeof(value) != TYPE_ARRAY or value.size() != 2 or not _number(value[0], -10000.0, 10000.0) or not _number(value[1], -10000.0, 10000.0):
		return false
	return _standable(Vector2(float(value[0]), float(value[1])), Data.map_data(id))


func _number(value: Variant, minimum: float, maximum: float) -> bool:
	return typeof(value) in [TYPE_INT, TYPE_FLOAT] and is_finite(float(value)) and float(value) >= minimum and float(value) <= maximum


func _integer(value: Variant, minimum: int, maximum: int) -> bool:
	return _number(value, minimum, maximum) and float(value) == floorf(float(value))


func _string_array(value: Variant, accepted: Array[String]) -> bool:
	if typeof(value) != TYPE_ARRAY or value.size() > accepted.size():
		return false
	var seen: Array[String] = []
	for item in value:
		if typeof(item) != TYPE_STRING or item not in accepted or item in seen:
			return false
		seen.append(item)
	return true


func _valid_charm_slots(value: Variant, owned: Array) -> bool:
	if typeof(value) != TYPE_ARRAY or value.size() != 2:
		return false
	var seen: Array[String] = []
	for id in value:
		if typeof(id) != TYPE_STRING:
			return false
		if id.is_empty():
			continue
		if id not in owned or id in seen:
			return false
		seen.append(id)
	return true
