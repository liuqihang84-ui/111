extends SceneTree
## Campaign behavior tests; scene tests cover rendering and UI independently.

const Model = preload("res://scripts/campaign_model.gd")
const Data = preload("res://scripts/campaign_data.gd")
const Puzzles = preload("res://scripts/puzzle_rules.gd")
var checks := 0
var failures := 0


func _initialize() -> void:
	call_deferred("_run")


func _check(condition: bool, description: String) -> void:
	checks += 1
	if not condition:
		failures += 1
		printerr("FAIL: ", description)


static func _new_game(mode: String = "standard"):
	var model = Model.new()
	model.begin(mode)
	_close_dialogue(model)
	return model


static func _peaceful(model) -> void:
	for enemy in model.enemies:
		enemy.alive = false


static func _advance(model, seconds: float) -> void:
	var remaining := seconds
	while remaining > 0.00001:
		var step := minf(remaining, 0.1)
		model.update(Vector2.ZERO, step)
		remaining -= step


static func _close_dialogue(model) -> void:
	for line in range(100):
		if model.status != "dialogue":
			return
		model.next_dialogue()


static func _interact_object(model, object_id: String) -> bool:
	for object in model.objects:
		if object.id == object_id:
			model.player_position = object.position
			model.lantern()
			if object.get("ability", "") == "pulse":
				_advance(model, model.pulse_cooldown + 0.01)
				if model.light < 25.0:
					_advance(model, 4.0)
				model.pulse()
			elif object.get("ability", "") == "shield":
				_advance(model, model.shield_cooldown + 0.01)
				if model.light < 35.0:
					_advance(model, 6.0)
				model.shield()
			var result: bool = model.interact()
			_close_dialogue(model)
			return result
	return false


static func _complete_required(model) -> bool:
	for object_id in model.map_info().required:
		if not _interact_object(model, str(object_id)):
			return false
	return _solve_map_puzzles(model)


static func _solve_map_puzzles(model) -> bool:
	for puzzle in Puzzles.definitions():
		if int(puzzle.map_id) != model.map_id or model.flags.get("puzzle:" + str(puzzle.id), false):
			continue
		model.player_position = puzzle.position
		model.status = "paused"
		for action in Puzzles.solution_path(str(puzzle.id)):
			if not model.puzzle_action(str(puzzle.id), action):
				return false
		if not model.flags.get("puzzle:" + str(puzzle.id), false):
			return false
		model.toggle_pause()
		_close_dialogue(model)
	return true


static func _defeat_boss(model) -> bool:
	if model.boss.is_empty():
		return true
	model.player_position = model.boss.position + Vector2(-1.0, 0.0)
	model.update(Vector2.ZERO, 0.01)
	# Fight through real cooldowns and tells, leave each telegraph's danger area.
	for step in range(5000):
		if model.boss.health == 0:
			_close_dialogue(model)
			return true
		if model.status != "playing":
			return false
		if model.boss.transition_for > 0.0:
			model.player_position = model.boss.position + Vector2(-5.0, 4.0)
		elif model.boss.shielded and model.boss.state != "dormant":
			_open_boss_window(model)
		if model.boss.state == "telegraph":
			_evade_boss(model)
		elif model.boss.state == "attack":
			_evade_boss(model)
		elif model.boss.state == "recover":
			model.player_position = model.boss.position + Vector2(-1.0, 0.0)
			model.last_direction = Vector2.RIGHT
			model.attack()
		model.update(Vector2.ZERO, 0.1)
	return false


static func _evade_boss(model) -> void:
	if model.boss.pattern in ["fan", "thrust", "charge"]:
		var direction: Vector2 = (model.boss.attack_target - model.boss.attack_origin).normalized()
		model.player_position = model.boss.attack_origin + direction.orthogonal() * 5.0
	else:
		model.player_position = model.boss.attack_target + Vector2(-5.0, 4.0)


static func _open_boss_window(model) -> void:
	if model.boss.type == "rune_colossus":
		for node in model.boss.puzzle_nodes:
			if node.active:
				model.player_position = node.position
				model.lantern()
				model.interact()
				return
	elif model.boss.type == "root_heart":
		if model.boss.phase_index == 1:
			if model.pulse_cooldown <= 0.0 and model.light >= 25.0:
				model.player_position = model.boss.position + Vector2(-1.0, 0.0)
				model.pulse()
		elif model.boss.phase_index == 2:
			var index: int = [2, 0, 1][int(model.boss.node_progress)]
			model.player_position = model.boss.puzzle_nodes[index].position
			model.lantern()
			model.interact()
		else:
			if model.shield_cooldown <= 0.0 and model.light >= 35.0:
				model.player_position = model.boss.puzzle_nodes[1].position
				model.lantern()
				model.shield()
				model.interact()


static func complete_campaign_model(mode: String = "standard") -> RefCounted:
	# Shared integration fixture: actual campaign rules, isolated ambient mobs.
	var model = _new_game(mode)
	for id in range(Data.map_count()):
		if model.map_id != id:
			return null
		_peaceful(model)
		if not _complete_required(model) or not _defeat_boss(model):
			return null
		if id < Data.map_count() - 1:
			model.player_position = model.map_info().exit
			if not model.travel(id + 1):
				return null
			_close_dialogue(model)
	return model if model.status == "won" else null


static func complete_campaign_fixture(mode: String = "standard") -> Dictionary:
	var model = complete_campaign_model(mode)
	return {} if model == null else model.save_data()


func _run() -> void:
	_test_content_shape()
	_test_movement_and_collision()
	_test_combat_and_cooldowns()
	_test_skills_and_resources()
	_test_distinct_enemy_behaviors()
	_test_boss_mechanics()
	_test_campaign_puzzles()
	_test_differentiated_sidequests()
	_test_enemy_tells_and_difficulty()
	_test_boss_tells()
	_test_shop_and_dialogue()
	_test_story_persistence()
	_test_journal_records()
	_test_two_charms_and_ability_mechanisms()
	_test_permanent_progress_and_death()
	_test_save_validation()
	_test_full_campaign()
	_test_post_ending_all_sidequests()
	print("CampaignModel: ", checks - failures, "/", checks, " checks passed")
	quit(1 if failures > 0 else 0)


func _test_content_shape() -> void:
	_check(Data.map_count() == 15 and Data.maps().size() == 15, "campaign contains fifteen maps")
	var enemy_types: Dictionary = {}
	var boss_count := 0
	for info in Data.maps():
		for enemy in info.enemies:
			enemy_types[enemy.type] = true
		if not info.boss.is_empty():
			boss_count += 1
	_check(enemy_types.size() == 10 and boss_count == 5, "campaign uses ten enemy types and five bosses")
	_check(Data.charms().size() == 6 and Data.side_quests().size() == 8, "campaign has six charms and eight side quests")
	var safe := true
	var model = _new_game()
	for info in Data.maps():
		safe = safe and model._standable(info.spawn, info) and model._standable(info.camp, info) and model._standable(info.exit, info)
		for object in info.objects:
			safe = safe and model._standable(object.position, info)
	_check(safe, "map spawn, camp, exit and interactions occupy legal unobstructed positions")


func _test_movement_and_collision() -> void:
	var model = _new_game()
	_peaceful(model)
	var origin: Vector2 = model.player_position
	model.update(Vector2.RIGHT, 0.1)
	_check(is_equal_approx(model.player_position.distance_to(origin), 0.36), "normal movement uses 3.6 world units per second")
	model.player_position = origin
	model.update(Vector2(1.0, -1.0), 0.1)
	_check(is_equal_approx(model.player_position.distance_to(origin), 0.36), "diagonal movement is normalized")
	model.player_position = origin
	model.dash(Vector2.RIGHT)
	model.update(Vector2.ZERO, 0.1)
	_check(is_equal_approx(model.player_position.x - origin.x, 0.9), "dash locks a direction and moves at nine units per second")
	var info: Dictionary = model.map_info()
	if not info.trees.is_empty():
		var tree: Vector2 = info.trees[0]
		model.player_position = tree - Vector2(0.75, 0.0)
		model.dash_cooldown = 0.0
		model.dash(Vector2.RIGHT)
		_advance(model, 0.3)
		_check(model.player_position.x < tree.x and model.player_position.distance_to(tree) >= 0.729, "dash cannot cross a collidable tree")
	var before: Vector2 = model.player_position
	var elapsed_before: float = model.elapsed
	model.update(Vector2(INF, 0.0), 0.1)
	model.update(Vector2.RIGHT, NAN)
	_check(model.player_position == before and model.elapsed == elapsed_before and not model.dash(Vector2(NAN, 0.0)), "nonfinite input is rejected without state corruption")


func _test_combat_and_cooldowns() -> void:
	var model = _new_game()
	model._enter_map(1)
	_peaceful(model)
	var enemy: Dictionary = model.enemies[0]
	enemy.alive = true
	enemy.health = 100
	enemy.max_health = 100
	model.player_position = enemy.position - Vector2(1.0, 0.0)
	model.last_direction = Vector2.RIGHT
	_check(model.attack() and enemy.health < 100 and not model.attack(), "one sword action deals damage once and respects cooldown")
	var once: int = enemy.health
	model.update(Vector2.ZERO, 0.1)
	_check(enemy.health == once, "the swing's visual duration does not repeatedly deal damage")
	model.attack_cooldown = 0.0
	model.last_direction = Vector2.LEFT
	model.attack()
	_check(enemy.health == once, "targets behind the sword arc are not damaged")
	model.last_direction = Vector2.RIGHT
	model.attack_cooldown = 0.0
	enemy.health = 1
	var coins_before: int = model.coins
	model.attack()
	_check(not enemy.alive and enemy.phase == "dead" and model.coins == coins_before + 3, "enemy death produces a first-kill reward")
	model._enter_map(1)
	var revived: Dictionary = model.enemies[0]
	model._hurt_enemy(revived, 10000)
	_check(model.coins == coins_before + 3, "revisited enemies cannot duplicate first-kill rewards")
	model.attack()
	model.dash(Vector2.RIGHT)
	model.toggle_pause()
	var paused := [model.elapsed, model.attack_cooldown, model.dash_cooldown, model.invulnerable_for, model.light]
	model.update(Vector2.RIGHT, 0.1)
	_check(paused == [model.elapsed, model.attack_cooldown, model.dash_cooldown, model.invulnerable_for, model.light] and not model.attack() and not model.dash(Vector2.RIGHT), "pause freezes simulation and blocks gameplay actions")


func _test_skills_and_resources() -> void:
	var model = _new_game()
	_peaceful(model)
	_check(not model.pulse() and not model.shield() and model.lantern(), "initial lantern works while chapter skills remain locked")
	model.abilities.assign(["pulse", "lens", "echo", "shield"])
	model.light = 100.0
	_check(model.pulse() and is_equal_approx(model.light, 75.0) and not model.pulse(), "light pulse costs energy and has a real cooldown")
	_check(model.shield() and is_equal_approx(model.light, 40.0), "shield consumes its defined energy cost")
	var health_before: int = model.health
	model._take_damage(30)
	_check(model.health == health_before, "active shield absorbs incoming damage")
	model._take_damage(20)
	_check(model.health == health_before - 10 and model.shield_for == 0.0, "exhausting shield capacity visibly breaks it and passes only excess damage to health")
	model.light = 0.0
	_check(model.lantern() and not model.pulse() and not model.shield(), "empty energy leaves exploration available and refuses costly skills")
	_advance(model, 2.0)
	_check(model.light > 0.0, "light energy automatically recovers")
	model.health = 30
	var potions_before: int = model.potions
	_check(model.use_potion() and model.health == 70 and model.potions == potions_before - 1, "healing consumes exactly one potion and restores health")
	model.health = model.max_health
	_check(not model.use_potion() and model.potions == potions_before - 1, "full health cannot waste a potion")


func _enemy_fixture(type: String) -> Dictionary:
	for info in Data.maps():
		for entry in info.enemies:
			if entry.type != type:
				continue
			var model = _new_game()
			model._enter_map(int(info.id))
			_peaceful(model)
			for enemy in model.enemies:
				if enemy.id == entry.id:
					enemy.alive = true
					return {"model": model, "enemy": enemy}
	return {}


func _test_distinct_enemy_behaviors() -> void:
	var fixture := _enemy_fixture("lamp_moth")
	var model = fixture.model
	var enemy: Dictionary = fixture.enemy
	model.player_position = enemy.position + Vector2(2, 0)
	var original: Vector2 = enemy.position
	_advance(model, 0.4)
	_check(enemy.phase == "patrol" and enemy.position.distance_to(original) > 0.3 and enemy.orbit_time > 0.0, "lamp moth actually circles before choosing a lunge")
	fixture = _enemy_fixture("wood_guard")
	model = fixture.model
	enemy = fixture.enemy
	enemy.facing = Vector2.RIGHT
	model.player_position = enemy.position + Vector2.RIGHT
	model.last_direction = Vector2.LEFT
	var initial_hp: int = enemy.health
	model.attack()
	var front_damage: int = initial_hp - enemy.health
	model.player_position = enemy.position + Vector2.LEFT
	model.last_direction = Vector2.RIGHT
	model.attack_cooldown = 0.0
	var before_back: int = enemy.health
	model.attack()
	_check(front_damage == 5 and before_back - int(enemy.health) == 18, "wood guard blocks its front while a rear sword hit deals full damage")
	fixture = _enemy_fixture("drowned_shadow")
	model = fixture.model
	enemy = fixture.enemy
	model.player_position = enemy.position + Vector2(3, 0)
	_advance(model, 0.1)
	_check(not enemy.visible and enemy.phase == "hidden", "drowned shadow begins concealed outside its close warning range")
	model.lantern()
	_advance(model, 0.01)
	_check(enemy.visible and enemy.phase == "telegraph" and enemy.telegraph_for > 0.9, "raising the lamp reveals the ambush with a readable full warning")
	fixture = _enemy_fixture("marsh_spider")
	model = fixture.model
	enemy = fixture.enemy
	model.player_position = enemy.position + Vector2(2, 0)
	model.update(Vector2.ZERO, 0.01)
	_advance(model, float(enemy.telegraph_for) + 0.08)
	_check(model.hazards.size() == 1 and model.slow_for > 0.0, "spider leaves a persistent web at its locked target")
	var web_position: Vector2 = model.player_position
	model.update(Vector2.RIGHT, 0.1)
	_check(model.player_position.distance_to(web_position) < 0.23, "web slows ordinary movement without removing control")
	enemy.alive = false
	_advance(model, 4.0)
	_check(model.hazards.is_empty() and model.slow_for == 0.0, "web hazard and its slow expire without a permanent status lock")
	fixture = _enemy_fixture("hollow_patrol")
	model = fixture.model
	enemy = fixture.enemy
	model.player_position = enemy.position + Vector2(0.5, 0)
	model.update(Vector2.ZERO, 0.01)
	_advance(model, float(enemy.telegraph_for) + 0.31)
	_check(enemy.combo_step == 2 and enemy.phase == "telegraph" and model.health == model.max_health - 16, "patrol's first sword is followed by a second independently telegraphed strike")
	_advance(model, float(enemy.telegraph_for) + 0.05)
	_check(model.health == model.max_health - 32, "both combo attacks have genuine separate damage windows")
	fixture = _enemy_fixture("dusk_archer")
	model = fixture.model
	enemy = fixture.enemy
	model.player_position = enemy.position + Vector2(4, 0)
	model.update(Vector2.ZERO, 0.01)
	_advance(model, float(enemy.telegraph_for) + 0.04)
	_check(model.projectiles.size() == 3 and model.projectiles[0].direction != model.projectiles[1].direction and model.projectiles[1].direction != model.projectiles[2].direction, "archer creates three distinct moving projectiles rather than a solid wide rectangle")
	model.player_position = enemy.attack_origin + Vector2.RIGHT.rotated(0.16) * 5.0
	var gap_health: int = model.health
	_advance(model, 0.7)
	_check(model.health == gap_health, "the gap between fan arrows remains a usable safe lane")
	fixture = _enemy_fixture("mist_beast")
	model = fixture.model
	enemy = fixture.enemy
	model.player_position = enemy.position + Vector2(4, 0)
	model.update(Vector2.ZERO, 0.01)
	var locked: Vector2 = enemy.attack_target
	var charge_start: Vector2 = enemy.position
	model.player_position = enemy.position + Vector2(0, 3)
	_advance(model, float(enemy.telegraph_for) + 0.15)
	_check(enemy.position.distance_to(charge_start) > 1.0 and enemy.attack_target == locked and model.health == model.max_health, "beast charge moves toward its locked target and can be sidestepped")


func _boss_fixture(id: int):
	var model = _new_game()
	model._enter_map(id)
	model.abilities.assign(["pulse", "lens", "echo", "shield"])
	_peaceful(model)
	_complete_required(model)
	model.player_position = model.map_info().camp
	_advance(model, maxf(model.pulse_cooldown, model.shield_cooldown) + 1.1)
	model.player_position = model.boss.position + Vector2(-1.0, 0.0)
	model.update(Vector2.ZERO, 0.01)
	return model


func _test_boss_mechanics() -> void:
	var model = _boss_fixture(6)
	var start: Vector2 = model.boss.position
	model.player_position = start + Vector2(0, 3)
	_advance(model, float(model.boss.telegraph_for) + 0.15)
	_check(model.boss.position.distance_to(start) > 0.7 and model.health == model.max_health, "mist hunter really dashes along its warned locked path")
	model = _boss_fixture(12)
	_advance(model, float(model.boss.telegraph_for) + 0.33)
	_check(model.boss.state == "telegraph" and model.boss.sub_attack == 2 and model.boss.pattern == "thrust", "night warden transitions from sword sweep to a separate spear warning")
	var first_hit_health: int = model.health
	_evade_boss(model)
	_advance(model, float(model.boss.telegraph_for) + 0.05)
	_check(model.health == first_hit_health, "night warden's second strike can be independently dodged")
	model = _boss_fixture(9)
	var boss_health: int = model.boss.health
	model.last_direction = Vector2.RIGHT
	model.attack()
	_check(model.boss.health == boss_health and model.boss.shielded, "rune colossus cannot be damaged through its closed ward")
	model.player_position = model.boss.puzzle_nodes[1].position
	model.lantern()
	_check(not model.interact(), "inactive colossus rune cannot bypass its ordered ward")
	model.player_position = model.boss.puzzle_nodes[0].position
	_check(model.interact() and not model.boss.shielded and model.boss.exposure_for > 5.9 and model.boss.telegraph_for >= 1.39, "active echoed rune opens six seconds of ward exposure with a complete new warning")
	model.player_position = model.boss.position + Vector2(-1, 0)
	model.last_direction = Vector2.RIGHT
	model.attack_cooldown = 0.0
	model.attack()
	_check(model.boss.health < boss_health, "ordinary sword damage works during the rune's actual exposure window")
	_advance(model, 6.1)
	_check(model.boss.shielded and model.boss.puzzle_nodes[1].active, "expired ward exposure rotates to the next authored rune")
	model = _boss_fixture(14)
	var initial: int = model.boss.health
	model.last_direction = Vector2.RIGHT
	model.attack()
	_check(model.boss.health == initial, "root heart's first closed phase resists ordinary damage")
	_check(model.pulse() and not model.boss.shielded and model.boss.health == initial - 30, "light pulse genuinely breaks the root-ring phase")
	model._hurt_boss(240)
	_check(model.boss.phase_index == 2 and model.boss.transition_for == 2.0 and model.boss.shielded, "root heart changes phase safely at its two-thirds health threshold")
	_advance(model, 2.05)
	model.player_position = model.boss.puzzle_nodes[0].position
	model.lantern()
	_check(not model.interact(), "wrong return-flow rune does not open the second phase")
	for index in [2, 0, 1]:
		model.player_position = model.boss.puzzle_nodes[index].position
		model.lantern()
		model.interact()
	_check(not model.boss.shielded and model.boss.exposure_for >= 6.9, "echoed return-shore-archive order opens the seven-second second-phase window")
	model._hurt_boss(260)
	_advance(model, 2.05)
	model.player_position = model.boss.puzzle_nodes[1].position
	model.lantern()
	_check(model.boss.phase_index == 3 and not model.interact(), "final root phase requires active protection as well as a revealed real node")
	model.shield()
	_check(model.interact() and not model.boss.shielded, "lens, lantern and live shield stabilize the true final node")
	model._hurt_boss(10000)
	_close_dialogue(model)
	_check(model.status == "won" and model.flags.get("ending_seen", false), "defeated three-phase root heart concludes through its full story dialogue")


func _test_campaign_puzzles() -> void:
	var model = _new_game()
	_peaceful(model)
	_complete_required(model)
	model.player_position = model.map_info().exit
	model.travel(1)
	_close_dialogue(model)
	_peaceful(model)
	var puzzle: Dictionary = Puzzles.definitions()[0]
	model.player_position = puzzle.position
	_check(model.interact() and model.status == "paused" and "puzzle:" + str(puzzle.id) in model.events, "interacting with a real puzzle pauses play and requests its panel")
	var path: Array = Puzzles.solution_path(str(puzzle.id))
	_check(model.puzzle_action(str(puzzle.id), path[0]), "puzzle panel action changes a validated logical state")
	var partial: Dictionary = model.save_data()
	var restored = Model.new()
	_check(restored.load_data(partial) and restored.puzzle_states[puzzle.id] == model.puzzle_states[puzzle.id], "unfinished puzzle moves survive JSON-compatible campaign saves")
	var before: int = model.coins
	for index in range(1, path.size()):
		model.puzzle_action(str(puzzle.id), path[index])
	_check(model.flags.get("puzzle:" + str(puzzle.id), false) and model.coins == before + int(puzzle.reward_coins) and model.status == "paused", "solved puzzle pays once and lets the player read success before closing")
	var earned: int = model.coins
	_check(not model.puzzle_action(str(puzzle.id), path[0]) and model.coins == earned, "solved-puzzle controls cannot duplicate reward currency")
	var tampered: Dictionary = model.save_data()
	tampered.flags.erase("puzzle:" + str(puzzle.id))
	_check(not restored.load_data(tampered), "solved state without its committed reward flag is rejected")
	model.toggle_pause()
	_complete_required(model)
	model.player_position = model.map_info().exit
	model.travel(2)
	_close_dialogue(model)
	_peaceful(model)
	var old: Dictionary = model.save_data()
	old.campaign_version = 2
	old.erase("puzzle_states")
	for key in old.flags.keys():
		if str(key).begins_with("puzzle:") or str(key).begins_with("puzzle_legacy:"):
			old.flags.erase(key)
	var migrated = Model.new()
	_check(migrated.load_data(old) and migrated.flags.get("puzzle_legacy:" + str(puzzle.id), false) and migrated.coins == int(old.coins), "older unlocked maps migrate without a new puzzle softlock or unearned rewards")


func _test_differentiated_sidequests() -> void:
	var tone_quest: Dictionary = {}
	var ledger: Dictionary = {}
	for quest in Data.side_quests():
		if quest.get("mechanic", "") == "tone_sequence":
			tone_quest = quest
		elif quest.get("mechanic", "") == "ledger_choice":
			ledger = quest
	_check(not tone_quest.is_empty() and not ledger.is_empty(), "authored side quests contain both audible sequencing and ledger reasoning")
	if tone_quest.is_empty() or ledger.is_empty():
		return
	var model = _new_game()
	model.abilities.assign(["pulse", "lens", "echo", "shield"])
	model._enter_map(int(tone_quest.map_id))
	_peaceful(model)
	var before: int = model.coins
	_interact_object(model, str(tone_quest.sequence[1]))
	_interact_object(model, str(tone_quest.sequence[2]))
	_check(not model.flags.get("quest:" + str(tone_quest.id), false) and model.coins == before, "wrong tone order is free and cannot auto-complete collection flags")
	for id in tone_quest.sequence:
		_interact_object(model, str(id))
	_check(model.flags.get("quest:" + str(tone_quest.id), false) and model.coins == before + int(tone_quest.reward_coins) and str(tone_quest.reward_charm) in model.owned_charms, "echo and lantern connect the actual low-high-middle sequence into a unique reward")
	var earned: int = model.coins
	for id in tone_quest.sequence:
		_interact_object(model, str(id))
	_check(model.coins == earned and "tone_low" in model.events and "tone_high" in model.events and "tone_mid" in model.events, "replaying the distinct tones preserves the completed reward")
	model = _new_game()
	for object_id in ledger.object_ids:
		for info in Data.maps():
			for object in info.objects:
				if object.id == object_id:
					model._enter_map(int(info.id))
					_peaceful(model)
					_interact_object(model, str(object_id))
	_check(not model.flags.get("quest:" + str(ledger.id), false), "three ledger pages only make the accounting ready, without awarding completion")
	model._enter_map(0)
	for object in model.objects:
		if object.get("npc_key", "") == "afu":
			model.player_position = object.position
			model.interact()
	for step in range(100):
		if not model.dialogue_choices.is_empty():
			break
		model.next_dialogue()
	_check(model.dialogue_choices.size() == 3 and model.dialogue_speaker == "阿芙", "merchant presents three explicit accounting choices after the collected evidence")
	model.next_dialogue()
	_check(model.status == "dialogue" and model.dialogue_index == 0, "advance cannot silently accept the default ledger answer")
	before = model.coins
	_check(model.choose_choice("five") and not model.flags.get("quest:" + str(ledger.id), false) and model.coins == before, "incorrect accounting returns feedback without taking currency or rewards")
	_check(model.choose_choice(str(ledger.correct_choice)) and model.flags.get("quest:" + str(ledger.id), false) and model.coins == before + int(ledger.reward_coins), "correct accounting pays exactly once after an explicit choice")
	_close_dialogue(model)
	_check(not model.choose_choice(str(ledger.correct_choice)) and model.coins == before + int(ledger.reward_coins), "completed dialogue choices cannot duplicate a ledger reward")


func _test_enemy_tells_and_difficulty() -> void:
	var model = _new_game()
	model._enter_map(1)
	_peaceful(model)
	var enemy: Dictionary = model.enemies[0]
	enemy.alive = true
	model.player_position = enemy.position + Vector2(0.5, 0.0)
	model.update(Vector2.ZERO, 0.01)
	_check(enemy.phase == "telegraph" and enemy.telegraph_for > 0.0 and model.health == model.max_health, "nearby enemies visibly wind up before dealing damage")
	_advance(model, float(enemy.telegraph_for) + 0.1)
	_check(model.health < model.max_health, "enemy attacks deal damage after their telegraph")
	var damaged: int = model.health
	model._take_damage(20)
	_check(model.health == damaged, "damage invulnerability blocks overlap hits")
	var damages: Array[int] = []
	for mode in ["story", "standard", "challenge"]:
		var game = Model.new()
		game.begin(mode)
		_close_dialogue(game)
		game._take_damage(20)
		damages.append(game.max_health - game.health)
	_check(damages == [13, 20, 25], "three difficulties scale damage without changing maps or quest content")


func _test_boss_tells() -> void:
	var model = _new_game()
	model._enter_map(3)
	_peaceful(model)
	_check(_complete_required(model), "boss-area prerequisites can be completed by interaction")
	model.player_position = model.boss.position + Vector2(-1.0, 0.0)
	model.update(Vector2.ZERO, 0.01)
	_check(model.boss.state == "telegraph" and model.boss.telegraph_for >= 1.2 and model.health == model.max_health, "boss begins with a full warning before any damage")
	model.toggle_pause()
	var tell_before: float = model.boss.telegraph_for
	model.update(Vector2.ZERO, 0.1)
	_check(model.boss.telegraph_for == tell_before, "pause freezes boss warning time")
	model.toggle_pause()
	_advance(model, tell_before + 0.1)
	_check(model.health < model.max_health, "remaining within the warned boss ring takes damage")
	var damaged: int = model.health
	_advance(model, 0.1)
	_check(model.health == damaged, "one boss pulse cannot repeatedly deal damage")
	model._enter_map(3)
	_peaceful(model)
	model.player_position = model.boss.position + Vector2(-1.0, 0.0)
	model.update(Vector2.ZERO, 0.01)
	_advance(model, float(model.boss.telegraph_for) - 0.05)
	model.dash(Vector2.LEFT)
	_advance(model, 0.1)
	_check(model.health == damaged, "a timed dodge covers the boss damage window")


func _test_shop_and_dialogue() -> void:
	var model = _new_game()
	var merchant: Dictionary = {}
	for object in model.objects:
		if object.get("npc_key", "") == "afu":
			merchant = object
	_check(not merchant.is_empty(), "village provides merchant Afu")
	if merchant.is_empty():
		return
	model.player_position = merchant.position
	model.interact()
	var dialogue_elapsed: float = model.elapsed
	model.update(Vector2.RIGHT, 0.1)
	_check(model.status == "dialogue" and model.elapsed == dialogue_elapsed, "dialogue freezes gameplay while its lines advance")
	_close_dialogue(model)
	model.potions = 0
	var before: int = model.coins
	_check(model.buy("potion") and model.coins == before - 8 and model.potions == 1, "merchant trades exact currency for a healing item")
	model.coins = 100
	_check(model.buy("home_knot") and not model.buy("home_knot") and "home_knot" in model.owned_charms, "charms are purchased once with bounded ownership")
	model.player_position = model.map_info().camp
	_check(model.equip("home_knot") and model.max_health == 110 and not model.equip("missing"), "owned charms can be equipped at camp and invalid ids are refused")


func _test_two_charms_and_ability_mechanisms() -> void:
	var model = _new_game()
	model.owned_charms.assign(["home_knot", "forest_leaf", "clear_stone"])
	model.player_position = model.map_info().camp
	_check(model.equip("home_knot", 0) and model.equip("forest_leaf", 1) and model.equipped_charms == ["home_knot", "forest_leaf"] and model.max_health == 110, "two independent charm slots preserve both passive effects")
	model.dash(Vector2.RIGHT)
	_check(is_equal_approx(model.dash_cooldown, 0.81), "second charm applies its cooldown multiplier alongside first-slot health")
	model.equip("home_knot", 1)
	_check(model.equipped_charms == ["", "home_knot"], "moving one charm between slots cannot duplicate it")
	_check(model.equip("", 1) and model.max_health == 100, "explicit slot unequip removes its passive effect")
	var old := model.save_data()
	old.campaign_version = 1
	old.equipped_charm = "home_knot"
	old.erase("equipped_charms")
	var restored = Model.new()
	_check(restored.load_data(old) and restored.equipped_charms == ["home_knot", ""] and restored.max_health == 110, "previous single-slot campaign saves migrate deterministically")
	model._enter_map(6)
	_peaceful(model)
	model.abilities.assign(["pulse", "lens"])
	for object in model.objects:
		if object.get("ability", "") == "lens":
			model.player_position = object.position
			model.lantern_for = 0.0
			_check(not model.interact(), "possessing the lens alone does not activate hidden-path mechanisms")
			model.lantern()
			_check(model.interact(), "active lantern reveals the lens mechanism for interaction")
			break


func _test_story_persistence() -> void:
	var model = Model.new()
	model.begin()
	_check(model.status == "dialogue" and model.dialogue_lines == Data.map_data(0).intro, "new game presents the village's complete introduction")
	var unfinished_intro := model.save_data()
	var restored = Model.new()
	_check(restored.load_data(unfinished_intro) and restored.status == "dialogue" and restored.dialogue_lines == Data.map_data(0).intro, "interrupted introduction replays on load rather than being silently skipped")
	_close_dialogue(model)
	_check(model.flags.get("scene:intro:0", false), "fully read scene commits its permanent id once")
	_peaceful(model)
	_check(_complete_required(model) and model.flags.get("scene:outro:0", false), "ordinary-map completion presents and commits its outro")
	var before: int = model.coins
	for object in model.objects:
		if object.type == "note":
			model.player_position = object.position
			_check(model.interact() and model.status == "dialogue", "completed notes can be reread")
			_close_dialogue(model)
			_check(model.coins == before, "rereading a note does not duplicate its reward")
			break


func _test_journal_records() -> void:
	var model = Model.new()
	model.begin()
	_check(model.journal_records().is_empty(), "unread introduction does not appear in the journal")
	_close_dialogue(model)
	var initial: Array[Dictionary] = model.journal_records()
	_check(initial.size() == 1 and initial[0].id == "scene:intro:0" and initial[0].lines == Data.map_data(0).intro, "fully read introduction is retained with every line and its map")
	_check(_interact_object(model, "m00_worktable"), "a discovered investigation can be read through its real interaction")
	var records: Array[Dictionary] = model.journal_records()
	var worktable: Dictionary = {}
	for record in records:
		if record.id == "object:m00_worktable":
			worktable = record
	var expected_lines: Array = []
	for object in Data.map_data(0).objects:
		if object.id == "m00_worktable":
			expected_lines = object.text
	_check(records.size() == 2 and not worktable.is_empty() and worktable.lines == expected_lines and worktable.map_id == 0 and worktable.map_name == Data.map_data(0).name, "one discovered investigation adds its full text without revealing other records")
	var no_unseen := true
	for info in Data.maps():
		for object in info.objects:
			if not object.get("hidden", false):
				continue
			for record in records:
				if record.id == "object:" + str(object.id):
					no_unseen = false
	_check(no_unseen, "undiscovered hidden-path records are absent from the journal")
	var stable: Dictionary = model.save_data()
	var original_events: Array[String] = model.events.duplicate()
	var original_coins: int = model.coins
	var original_potions: int = model.potions
	model.journal_records()
	model.journal_records()
	_check(model.save_data() == stable and model.events == original_events and model.coins == original_coins and model.potions == original_potions, "reading the journal never changes progress, grants rewards or emits events")
	var restored = Model.new()
	_check(restored.load_data(JSON.parse_string(JSON.stringify(stable))) and restored.journal_records() == records, "save-load retains discovered journal texts without a new save field")
	worktable.lines[0] = "changed outside the model"
	_check(model.journal_records() == restored.journal_records(), "returned journal text is an independent read-only snapshot")


func _test_permanent_progress_and_death() -> void:
	var model = _new_game()
	var first: Dictionary = Data.side_quests()[0]
	for object_id in first.object_ids:
		for info in Data.maps():
			for object in info.objects:
				if object.id == object_id:
					model._enter_map(int(info.id))
					_peaceful(model)
					_interact_object(model, str(object_id))
	_check(model.flags.get("quest:" + str(first.id), false), "side-quest object collection grants its completion")
	var coins_after: int = model.coins
	model._check_side_quests()
	model._check_side_quests()
	_check(model.coins == coins_after, "side-quest reward transaction is idempotent")
	model.checkpoint_map = model.map_id
	model.checkpoint_position = model.map_info().camp
	model.health = 1
	model.invulnerable_for = 0.0
	model._take_damage(100)
	var permanent: Dictionary = model.flags.duplicate(true)
	_check(model.status == "lost", "lethal damage enters the death screen")
	model.retry()
	_check(model.status == "playing" and model.health == model.max_health and model.player_position == model.checkpoint_position and model.flags == permanent, "camp retry preserves permanent progress and restores a safe player")


func _test_save_validation() -> void:
	var model = _new_game()
	_peaceful(model)
	var data: Dictionary = model.save_data()
	var restored = Model.new()
	_check(restored.load_data(JSON.parse_string(JSON.stringify(data))) and restored.status == "playing" and restored.map_id == 0 and restored.invulnerable_for > 0.0, "JSON save round-trip restores stable progress with protected spawn")
	var before: Dictionary = restored.save_data()
	var invalid: Array[Dictionary] = []
	for key in ["version", "campaign_version", "map_id", "checkpoint_map", "health", "light", "coins", "potions", "elapsed", "difficulty", "flags", "abilities", "owned_charms", "equipped_charm", "equipped_charms", "puzzle_states", "position", "checkpoint_position"]:
		var missing := data.duplicate(true)
		missing.erase(key)
		invalid.append(missing)
	for mutation in [{"health": 0}, {"health": 101}, {"light": INF}, {"elapsed": NAN}, {"coins": -1}, {"potions": 4}, {"position": [INF, 0]}, {"difficulty": "unknown"}, {"abilities": ["pulse"]}, {"owned_charms": ["fake"]}, {"flags": {"invalid": true}}, {"equipped_charms": ["home_knot", "home_knot"]}]:
		var altered := data.duplicate(true)
		altered.merge(mutation, true)
		invalid.append(altered)
	if not Data.map_data(0).trees.is_empty():
		var in_tree := data.duplicate(true)
		var tree: Vector2 = Data.map_data(0).trees[0]
		in_tree.position = [tree.x, tree.y]
		invalid.append(in_tree)
	var rejected := true
	for malformed in invalid:
		rejected = rejected and not restored.load_data(malformed) and restored.save_data() == before
	_check(rejected, "missing, nonfinite, out-of-range and contradictory saves are rejected transactionally")
	var forged := data.duplicate(true)
	forged.map_id = 14
	forged.position = [Data.map_data(14).spawn.x, Data.map_data(14).spawn.y]
	forged.flags["visited:14"] = true
	_check(not restored.load_data(forged), "save cannot skip required earlier campaign progression")


func _test_full_campaign() -> void:
	for mode in ["story", "standard", "challenge"]:
		_play_complete_campaign(mode)


func _play_complete_campaign(mode: String) -> void:
	var model = _new_game(mode)
	var visited := 0
	var progression_ok := true
	var revision: int = model.map_revision
	for id in range(Data.map_count()):
		progression_ok = progression_ok and model.map_id == id
		_peaceful(model)
		model.player_position = model.map_info().exit
		if id < Data.map_count() - 1 and not model.map_info().required.is_empty():
			progression_ok = progression_ok and not model.can_travel(id + 1)
		progression_ok = progression_ok and _complete_required(model)
		progression_ok = progression_ok and _defeat_boss(model)
		if id == 3:
			var interrupted := model.save_data()
			interrupted.flags.erase("scene:outro:3")
			var mid_boss_restore = Model.new()
			_check(mid_boss_restore.load_data(interrupted) and mid_boss_restore.status == "dialogue" and mid_boss_restore.dialogue_lines == Data.map_data(3).outro, "mid-chapter boss conclusion restores its unread story")
			_close_dialogue(mid_boss_restore)
			mid_boss_restore.player_position = mid_boss_restore.map_info().exit
			_check(mid_boss_restore.can_travel(4), "restored boss conclusion unblocks the chapter exit")
		visited += 1
		if id < Data.map_count() - 1:
			model.player_position = model.map_info().exit
			progression_ok = progression_ok and model.travel(id + 1) and model.map_revision > revision
			_close_dialogue(model)
			revision = model.map_revision
	_check(progression_ok and visited == 15 and model.status == "won", mode + ": all fifteen maps traverse real objectives and boss victories to ending")
	_check(model.abilities.size() == 4 and "pulse" in model.abilities and "lens" in model.abilities and "echo" in model.abilities and "shield" in model.abilities, "five chapters award all four abilities in their progression chain")
	var solved := 0
	for puzzle in Puzzles.definitions():
		if model.flags.get("puzzle:" + str(puzzle.id), false):
			solved += 1
	_check(solved == 30 and model.max_light == 110.0, "all thirty real puzzles and optional permanent energy growth can be completed")
	var final_save: Dictionary = model.save_data()
	var restored = Model.new()
	_check(restored.load_data(final_save) and restored.status == "playing" and restored.flags.get("ending_seen", false), "completed campaign saves preserve the ending and resume free exploration")
	var during_outro := final_save.duplicate(true)
	during_outro.flags.erase("ending_seen")
	during_outro.flags.erase("scene:outro:14")
	var outro_restore = Model.new()
	_check(outro_restore.load_data(during_outro) and outro_restore.status == "dialogue" and outro_restore.dialogue_lines.size() == Data.map_data(14).outro.size(), "mid-ending save resumes the complete conclusion instead of skipping its text")
	_close_dialogue(outro_restore)
	_check(outro_restore.status == "won" and outro_restore.flags.get("ending_seen", false), "resumed ending dialogue finishes into the completed game state")
	var preserved: Dictionary = model.flags.duplicate(true)
	var coins_before: int = model.coins
	_check(model.continue_exploring() and model.status == "playing" and model.flags == preserved and model.coins == coins_before, "ending's continue button returns safely to play without clearing permanent rewards")
	_check(model.travel(0) and model.map_id == 0, "post-ending exploration can actually return from the sanctum camp to the village")
	_close_dialogue(model)
	_peaceful(model)
	var freeroam: Dictionary = model.save_data()
	var returning = Model.new()
	_check(returning.load_data(freeroam) and returning.status == "playing" and returning.map_id == 0 and returning.flags.get("ending_seen", false), "saving the revisited village continues there without reopening the ending screen")


func _test_post_ending_all_sidequests() -> void:
	var model = complete_campaign_model()
	if model == null:
		_check(false, "full campaign fixture reaches the ending before side-quest revisit")
		return
	model.continue_exploring()
	var all_completed := true
	for quest in Data.side_quests():
		var ids: Array = quest.sequence if quest.get("mechanic", "") == "tone_sequence" else quest.object_ids
		for id in ids:
			var found_map := -1
			for info in Data.maps():
				for object in info.objects:
					if object.id == id:
						found_map = int(info.id)
			if found_map < 0:
				all_completed = false
				continue
			if model.map_id != found_map:
				model.player_position = model.map_info().camp
				all_completed = all_completed and model.travel(found_map)
				_close_dialogue(model)
			_peaceful(model)
			all_completed = all_completed and _interact_object(model, str(id))
		if quest.get("mechanic", "") == "ledger_choice":
			model.player_position = model.map_info().camp
			model.travel(0)
			_close_dialogue(model)
			_peaceful(model)
			for object in model.objects:
				if object.get("npc_key", "") == "afu":
					model.player_position = object.position
					model.interact()
			for step in range(100):
				if not model.dialogue_choices.is_empty():
					break
				model.next_dialogue()
			all_completed = all_completed and model.choose_choice(str(quest.correct_choice))
			_close_dialogue(model)
		all_completed = all_completed and bool(model.flags.get("quest:" + str(quest.id), false))
	_check(all_completed and model.status == "playing", "all eight optional quests can genuinely finish through post-ending travel, interactions, tones and accounting")
	var paid: int = model.coins
	model._check_side_quests()
	model._check_side_quests()
	_check(model.coins == paid, "all eight quest completions remain idempotent after revisiting")
	var saved: Dictionary = model.save_data()
	var restored = Model.new()
	_check(restored.load_data(saved) and restored.status == "playing" and restored.coins == paid and restored.quest_log().filter(func(q): return q.id != "main" and q.completed).size() == 8, "post-ending eight-quest completion reloads with every unique reward intact")
