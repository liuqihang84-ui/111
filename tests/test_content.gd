extends SceneTree
## Validate authored references and reachable layouts without changing progress.

const Data = preload("res://scripts/campaign_data.gd")
const TYPES := ["npc", "note", "lamp", "crystal", "lens", "rune", "shield", "anchor", "chest", "side", "camp"]
const ENEMIES := ["lamp_moth", "mist_beast", "vine_root", "wood_guard", "marsh_spider", "drowned_shadow", "ruin_sentinel", "cracked_statue", "hollow_patrol", "dusk_archer"]
const ABILITIES := ["pulse", "lens", "echo", "shield"]
const GRID := 0.75
const PLAYER_RADIUS := 0.3

var checks := 0
var failures := 0


func _initialize() -> void:
	call_deferred("_run")


func _check(condition: bool, label: String) -> void:
	checks += 1
	if not condition:
		failures += 1
		printerr("FAIL: ", label)


func _run() -> void:
	var maps := Data.maps()
	_check(Data.map_count() == 15 and maps.size() == 15, "campaign contains fifteen maps")
	_check(Data.map_data(-1).is_empty() and Data.map_data(15).is_empty(), "invalid map references return empty data")
	_check(Data.enemy_data("unknown").is_empty(), "unknown enemy reference returns empty data")
	var ids := {}
	var objects := {}
	var abilities := {}
	var boss_count := 0
	var npc_keys := {}
	var used_enemies := {}
	for map in maps:
		_check(map.id >= 0 and map.id < 15 and maps[map.id].name == map.name, "map ID matches ordered campaign")
		_check(map.bounds is Rect2 and map.bounds.size.x > 10 and map.bounds.size.y > 10, "map has usable ground bounds: " + map.name)
		_check(not map.intro.is_empty() and not map.outro.is_empty(), "map has original story entry and completion: " + map.name)
		var local_objects := {}
		var rune_orders: Array[int] = []
		var camp_count := 0
		for object in map.objects:
			_check(not ids.has(object.id), "object ID is globally unique: " + object.id)
			ids[object.id] = true
			objects[object.id] = object
			local_objects[object.id] = object
			_check(object.type in TYPES and not object.title.is_empty() and not object.text.is_empty(), "interaction has a supported type and readable text: " + object.id)
			if object.has("ability"):
				_check(object.ability in ABILITIES and abilities.has(object.ability), "ability is obtained before its gate: " + object.id)
			if object.has("reward") and object.reward.has("ability"):
				var ability: String = object.reward.ability
				_check(ability in ABILITIES and not abilities.has(ability), "ability reward has one permanent source: " + object.id)
				abilities[ability] = true
			if object.has("order"):
				_check(object.type == "rune" and object.order > 0, "ordered interaction is a main rune: " + object.id)
				rune_orders.append(object.order)
			if object.has("npc_key"):
				_check(object.npc_key in ["afu", "xiaohe", "cen"], "only the three important NPCs are used")
				npc_keys[object.npc_key] = true
			if object.type == "camp":
				camp_count += 1
		var sorted_orders: Array[int] = rune_orders.duplicate()
		sorted_orders.sort()
		for index in range(sorted_orders.size()):
			_check(sorted_orders[index] == index + 1, "main runes have a continuous safe sequence: " + map.name)
		if map.id in [8, 9, 12]:
			_check(rune_orders != sorted_orders and map.has("puzzle_hint_id") and local_objects.has(map.puzzle_hint_id), "rune answer is inferred from an authored record, not array order")
			for object in map.objects:
				if object.type == "rune" and object.has("order"):
					_check(object.has("glyph") and not str(object.title).contains(str(object.order)), "rune is labeled by a readable pattern, not its answer number")
		for object in map.objects:
			if object.get("ability", "") == "lens":
				_check(object.get("hidden", false) and is_equal_approx(float(object.get("reveal_radius", 0)), 4.0), "lens-gated discovery requires a nearby raised lantern")
		_check(camp_count == 1, "map contains one safe camp: " + map.name)
		for required in map.required:
			_check(local_objects.has(required), "exit requirement resolves in its map: " + required)
			if local_objects.has(required):
				_check(local_objects[required].type not in ["side", "chest", "camp"], "optional content never blocks main progression: " + required)
		for enemy in map.enemies:
			_check(not ids.has(enemy.id), "enemy ID is globally unique: " + enemy.id)
			ids[enemy.id] = true
			_check(enemy.type in ENEMIES and not Data.enemy_data(enemy.type).is_empty(), "enemy uses a configured behavior: " + enemy.id)
			used_enemies[enemy.type] = true
		if not map.boss.is_empty():
			boss_count += 1
			_check(not ids.has(map.boss.id), "boss ID is globally unique")
			ids[map.boss.id] = true
			_check(map.id in [3, 6, 9, 12, 14] and map.boss.health > 0, "one boss closes each chapter")
			if not map.boss.reward_ability.is_empty():
				_check(map.id == 3 and map.boss.reward_ability == "pulse", "first boss grants pulse after the basic chapter")
				abilities[map.boss.reward_ability] = true
		_check_layout(map)
		if not map.boss.is_empty() and map.boss.has("mechanics"):
			for node in map.boss.mechanics.nodes:
				_check(not ids.has(node.id) and _clear(node.position, map), "dynamic boss rune is unique and outside solid geometry")
				ids[node.id] = true
	_check(boss_count == 5 and abilities.size() == 4, "campaign includes five bosses and four ability milestones")
	_check(npc_keys.size() == 3 and used_enemies.size() == 10, "all three NPCs and ten enemy types appear")
	_check_side_quests(objects)
	_check_charms(objects)
	_check_copy_isolation()
	_check_narrative(maps)
	var ending := "\n".join(Data.map_data(14).outro)
	_check("生还" in ending and "灯塔修复" in ending and "灯火村" in ending, "fixed ending saves the mentor and returns home")
	print("CampaignContent: ", checks - failures, "/", checks, " checks passed")
	quit(1 if failures > 0 else 0)


func _check_narrative(maps: Array[Dictionary]) -> void:
	var characters := 0
	var hanzi := 0
	var main_characters := 0
	var object_count := 0
	var required_count := 0
	var camp_count := 0
	var ability_gates := 0
	var hidden_count := 0
	var ordered_count := 0
	var enemy_count := 0
	var enemy_health := 0
	var boss_health := 0
	var chapter_totals := {}
	for map in maps:
		var lines: Array = []
		lines.append_array(map.intro)
		lines.append_array(map.outro)
		for line in map.intro + map.outro:
			main_characters += str(line).length()
		object_count += map.objects.size()
		required_count += map.required.size()
		enemy_count += map.enemies.size()
		for enemy in map.enemies:
			enemy_health += int(Data.enemy_data(enemy.type).health)
		if not map.boss.is_empty():
			boss_health += int(map.boss.health)
		for object in map.objects:
			if object.type != "camp":
				lines.append_array(object.text)
			else:
				camp_count += 1
			if object.id in map.required:
				for line in object.text:
					main_characters += str(line).length()
			if object.has("ability"):
				ability_gates += 1
			if object.get("hidden", false):
				hidden_count += 1
			if object.has("order"):
				ordered_count += 1
		var map_characters := 0
		for line in lines:
			var text := str(line)
			characters += text.length()
			hanzi += _hanzi_count(text)
			map_characters += text.length()
			_check(text.length() <= 100, "dialogue fits a readable page without mandatory waiting")
		_check(map_characters >= 1000, "map has a developed story and investigative records: " + map.name)
		chapter_totals[map.chapter] = int(chapter_totals.get(map.chapter, 0)) + map_characters
	_check(characters >= 18000, "five-chapter authored narrative is expanded beyond eighteen thousand characters")
	_check(hanzi >= 18000, "expanded authored narrative contains eighteen thousand Chinese characters")
	print("Content metrics: ", JSON.stringify({"narrative_characters": characters, "narrative_hanzi": hanzi, "main_readable_characters": main_characters, "chapter_characters": chapter_totals, "objects": object_count, "required_objects": required_count, "optional_noncamp_objects": object_count - required_count - camp_count, "camps": camp_count, "ability_action_gates": ability_gates, "hidden_lens_objects": hidden_count, "ordered_main_runes": ordered_count, "ordinary_enemies": enemy_count, "ordinary_enemy_health": enemy_health, "boss_health": boss_health}))


func _hanzi_count(text: String) -> int:
	var result := 0
	for index in range(text.length()):
		var code := text.unicode_at(index)
		if (code >= 0x3400 and code <= 0x9fff) or (code >= 0xf900 and code <= 0xfaff):
			result += 1
	return result


func _check_side_quests(objects: Dictionary) -> void:
	var quests := Data.side_quests()
	var object_maps := {}
	for map in Data.maps():
		for object in map.objects:
			object_maps[object.id] = map.id
	_check(quests.size() == 8, "campaign contains eight side quests")
	var quest_ids := {}
	var claimed_objects := {}
	for quest in quests:
		_check(not quest_ids.has(quest.id), "side quest ID is unique: " + quest.id)
		quest_ids[quest.id] = true
		_check(quest.map_id >= 0 and quest.map_id < 15 and quest.reward_coins >= 0 and not quest.description.is_empty(), "side quest has valid region and reward")
		_check(quest.object_ids.size() >= 2, "side quest has authored exploration steps: " + quest.title)
		for id in quest.object_ids:
			_check(objects.has(id) and not claimed_objects.has(id), "side quest object resolves uniquely: " + id)
			claimed_objects[id] = true
			if objects.has(id):
				_check(objects[id].type == "side", "side quest uses optional interaction: " + id)
		if quest.get("mechanic", "") == "tone_sequence":
			_check(quest.sequence.size() == 3 and quest.sequence[0] != quest.sequence[1] and quest.sequence[0] != quest.sequence[2] and quest.sequence[1] != quest.sequence[2], "tone quest has three distinct played endpoints")
			var tones: Array[String] = []
			for id in quest.sequence:
				_check(id in quest.object_ids and objects.has(id) and object_maps.get(id, -1) == quest.map_id, "tone sequence resolves within a single safe map: " + id)
				if objects.has(id):
					var object: Dictionary = objects[id]
					_check(object.get("repeatable", false) and object.get("ability", "") == "echo" and not str(object.get("tone_title", "")).is_empty(), "tone endpoints can be replayed with readable silent-mode clues")
					tones.append(str(object.get("tone", "")))
			_check(tones == ["low", "high", "mid"], "music is played in low-high-mid order rather than source-array order")
			_check(not str(quest.get("incorrect_text", "")).is_empty() and not str(quest.get("correct_text", "")).is_empty(), "tone quest has authored success and free-retry feedback")
		if quest.get("mechanic", "") == "ledger_choice":
			_check(quest.finish_npc == "afu" and quest.choices.size() == 3 and not quest.question.is_empty(), "ledger evidence leads to three choices with Afu")
			var choice_ids := {}
			var correct_answers := 0
			for choice in quest.choices:
				_check(not choice_ids.has(choice.id) and not choice.text.is_empty(), "ledger choices have unique stable identities and readable labels")
				choice_ids[choice.id] = true
				if choice.id == quest.correct_choice:
					correct_answers += 1
			_check(correct_answers == 1 and quest.correct_choice == "three", "local lamp inference has one correct answer: two roofs plus one street")
			_check(not quest.incorrect_text.is_empty() and not quest.correct_text.is_empty(), "ledger answer has authored explanation and free retry")


func _check_charms(objects: Dictionary) -> void:
	var charms := Data.charms()
	_check(charms.size() == 6, "campaign contains six fixed charms")
	var charm_ids := {}
	for charm in charms:
		_check(not charm_ids.has(charm.id) and charm.price > 0 and not charm.effect.is_empty(), "charm has unique identity, price and effect: " + charm.title)
		charm_ids[charm.id] = true
	for object in objects.values():
		if object.has("reward") and object.reward.has("charm"):
			_check(charm_ids.has(object.reward.charm), "chest charm reward resolves")
	for quest in Data.side_quests():
		if quest.has("reward_charm"):
			_check(charm_ids.has(quest.reward_charm), "quest charm reward resolves")


func _check_copy_isolation() -> void:
	var copy := Data.map_data(0)
	var original: String = copy.objects[0].text[0]
	copy.objects[0].text[0] = "modified runtime text"
	copy.trees.clear()
	_check(Data.map_data(0).objects[0].text[0] == original and not Data.map_data(0).trees.is_empty(), "runtime copies cannot mutate content definitions")


func _clear(point: Vector2, map: Dictionary) -> bool:
	var playable: Rect2 = map.bounds.grow(-PLAYER_RADIUS)
	if not playable.has_point(point):
		return false
	for tree in map.trees:
		if point.distance_squared_to(tree) < pow(PLAYER_RADIUS + 0.6, 2):
			return false
	for obstacle in map.obstacles:
		if point.distance_squared_to(obstacle.position) < pow(PLAYER_RADIUS + float(obstacle.radius), 2):
			return false
	return true


func _cell(point: Vector2, origin: Vector2) -> Vector2i:
	return Vector2i(roundi((point.x - origin.x) / GRID), roundi((point.y - origin.y) / GRID))


func _check_layout(map: Dictionary) -> void:
	var origin: Vector2 = map.bounds.position + Vector2.ONE * (PLAYER_RADIUS + 0.05)
	var width := floori((map.bounds.size.x - PLAYER_RADIUS * 2.0 - 0.1) / GRID) + 1
	var height := floori((map.bounds.size.y - PLAYER_RADIUS * 2.0 - 0.1) / GRID) + 1
	var passable := {}
	for y in range(height):
		for x in range(width):
			var key := Vector2i(x, y)
			if _clear(origin + Vector2(key) * GRID, map):
				passable[key] = true
	var start := _cell(map.spawn, origin)
	var reached := {start: true}
	var queue: Array[Vector2i] = [start]
	var index := 0
	while index < queue.size():
		var current := queue[index]
		index += 1
		for step in [Vector2i.LEFT, Vector2i.RIGHT, Vector2i.UP, Vector2i.DOWN]:
			var neighbor: Vector2i = current + step
			if passable.has(neighbor) and not reached.has(neighbor):
				reached[neighbor] = true
				queue.append(neighbor)
	for entry in [{"id": "spawn", "position": map.spawn}, {"id": "camp", "position": map.camp}, {"id": "exit", "position": map.exit}] + map.objects + map.enemies:
		_check(_clear(entry.position, map) and reached.has(_cell(entry.position, origin)), "authored location is navigable: %s/%s" % [map.name, entry.id])
	if not map.boss.is_empty():
		_check(_clear(map.boss.position, map) and reached.has(_cell(map.boss.position, origin)), "boss arena is navigable: " + map.name)
