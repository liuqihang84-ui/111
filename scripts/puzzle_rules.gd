extends RefCounted
## Original authored light puzzles. UI and persistent rewards live elsewhere.
## All public dictionaries are copies. Solutions are available only to test tools.

static var _definitions: Array[Dictionary] = []
static var _by_id: Dictionary = {}
static var _secrets: Dictionary = {}
static var _paths: Dictionary = {}
const DIRECTIONS := [Vector2i.RIGHT, Vector2i.DOWN, Vector2i.LEFT, Vector2i.UP]
const GLYPHS := ["芽", "羽", "波", "星", "石", "灯", "根", "门"]

static func definitions() -> Array[Dictionary]:
	_ensure()
	var result: Array[Dictionary] = []
	for item: Dictionary in _definitions:
		result.append(item.duplicate(true))
	return result

static func definition(id: String) -> Dictionary:
	_ensure()
	return _by_id.get(id, {}).duplicate(true)

static func initial_state(id: String) -> Dictionary:
	return definition(id).get("initial_state", {}).duplicate(true)

static func validate_state(id: String, state: Dictionary) -> bool:
	return is_state_valid(id, state)

static func solution_path(id: String) -> Array[Dictionary]:
	_ensure()
	var result: Array[Dictionary] = []
	for action: Dictionary in _paths.get(id, []):
		result.append(action.duplicate(true))
	return result

static func is_state_valid(id: String, state: Dictionary) -> bool:
	var data := definition(id)
	if data.is_empty() or not _integer(state.get("moves"), 0, 1000000000):
		return false
	var config: Dictionary = data.config
	match str(data.type):
		"mirror":
			return _integer_array(state.get("orientations"), config.cells.size(), 0, 1)
		"balance":
			return _integer_array(state.get("valves"), 3, 0, int(config.max_power))
		"runes":
			var chosen: Variant = state.get("chosen")
			if not chosen is Array or chosen.size() > int(config.length):
				return false
			for symbol: Variant in chosen:
				if not symbol is String or symbol not in config.symbols:
					return false
			return true
		"network":
			var switches: Variant = state.get("switches")
			if not switches is Array or switches.size() != 4:
				return false
			for active: Variant in switches:
				if not active is bool:
					return false
			return true
	return false

static func apply_action(id: String, state: Dictionary, action: Dictionary) -> Dictionary:
	var data := definition(id)
	if data.is_empty():
		return {}
	if not is_state_valid(id, state):
		return initial_state(id)
	var next := state.duplicate(true)
	var changed := false
	var kind: String = str(action.get("kind", ""))
	match str(data.type):
		"mirror":
			if kind == "rotate" and _integer(action.get("index"), 0, next.orientations.size() - 1):
				var index := int(action.index)
				next.orientations[index] = 1 - int(next.orientations[index])
				changed = true
		"balance":
			if kind == "adjust" and _integer(action.get("index"), 0, 2) and _integer(action.get("delta"), -1, 1):
				var index := int(action.index)
				var value := clampi(int(next.valves[index]) + int(action.delta), 0, int(data.config.max_power))
				changed = value != int(next.valves[index])
				next.valves[index] = value
		"runes":
			if kind == "choose" and action.get("symbol") is String and action.symbol in data.config.symbols and next.chosen.size() < int(data.config.length):
				next.chosen.append(str(action.symbol))
				changed = true
			elif kind == "undo" and not next.chosen.is_empty():
				next.chosen.pop_back()
				changed = true
			elif kind == "clear" and not next.chosen.is_empty():
				next.chosen.clear()
				changed = true
		"network":
			if kind == "toggle" and _integer(action.get("index"), 0, 3):
				var index := int(action.index)
				next.switches[index] = not bool(next.switches[index])
				changed = true
	if changed:
		next.moves = mini(int(next.moves) + 1, 1000000000)
	return next

static func is_solved(id: String, state: Dictionary) -> bool:
	if not is_state_valid(id, state):
		return false
	var info := view(id, state)
	return bool(info.get("solved", false))

static func view(id: String, state: Dictionary) -> Dictionary:
	var data := definition(id)
	if data.is_empty():
		return {"valid": false, "solved": false, "type": ""}
	if not is_state_valid(id, state):
		return {"valid": false, "solved": false, "type": data.type}
	var result := {"valid": true, "solved": false, "type": data.type, "moves": int(state.moves)}
	var config: Dictionary = data.config
	match str(data.type):
		"mirror":
			result.merge(_beam(config, state.orientations))
			result.solved = result.beam_reached
			result.orientations = state.orientations.duplicate()
		"balance":
			var total := 0
			for index in range(3):
				total += int(state.valves[index]) * int(config.weights[index])
			var difference := int(state.valves[int(config.pair[0])]) - int(state.valves[int(config.pair[1])])
			result.valves = state.valves.duplicate()
			result.power_total = total
			result.power_difference = difference
			result.within_bounds = true
			result.solved = total == int(config.total) and difference == int(config.difference)
		"runes":
			result.chosen = state.chosen.duplicate()
			result.expected_length = int(config.length)
			result.complete = state.chosen.size() == int(config.length)
			result.solved = state.chosen == _secrets[id]
		"network":
			var mask := 0
			for index in range(4):
				if bool(config.initial_lights[index]):
					mask ^= 1 << index
			for index in range(4):
				if bool(state.switches[index]):
					mask ^= int(config.effects[index])
			var lit: Array[bool] = []
			for index in range(4):
				lit.append((mask & (1 << index)) != 0)
			var dangerous := false
			var danger_edges: Array[Vector2i] = []
			for pair: Vector2i in config.danger_pairs:
				if lit[pair.x] and lit[pair.y]:
					dangerous = true
					danger_edges.append(pair)
			result.switches = state.switches.duplicate()
			result.lit = lit
			result.dangerous = dangerous
			result.danger_edges = danger_edges
			result.solved = lit == config.target and not dangerous
	return result

static func hint(id: String, state: Dictionary) -> String:
	var data := definition(id)
	if data.is_empty():
		return "这盏机关尚未记录。"
	var info := view(id, state)
	if not bool(info.valid):
		return "机关记录不完整，可以从初始状态重新观察。"
	if bool(info.solved):
		return "灯芯已经稳定。光路、线索与机关彼此呼应。"
	match str(data.type):
		"mirror":
			if bool(info.cycle):
				return "光在镜片间绕回了原处。观察第二次经过的格子，寻找通向灯芯的出口。"
			return "从光源逐格追踪。斜镜让光转过直角；先修好光正在碰到的镜片，再看下一段。"
		"balance":
			return "总功率按每阀旁的倍率计算；两阀差值比较的是格数。先保持差值，再用剩余导阀补足总量。"
		"runes":
			return "线索描写的是先后发生的事。把事物认成纹样，再依故事方向连接；错了可退回一枚或清空。"
		"network":
			if bool(info.dangerous):
				return "红线两端同时亮起，光会短接。开关改变的是整组节点，再改变其中一处也会影响另一处。"
			return "观察每个开关连向哪些灯。重叠的导线会相互抵消；铜圈标出了应该亮起的灯芯。"
	return str(data.clue)

static func _beam(config: Dictionary, orientations: Array) -> Dictionary:
	var size := int(config.size)
	var cell: Vector2i = config.source
	var direction: Vector2i = config.source_direction
	var beam: Array[Vector2i] = [cell]
	var visited: Dictionary = {}
	var cycle := false
	var reached := false
	var blocked := false
	for _step in range(size * size * 4 + 8):
		cell += direction
		beam.append(cell)
		if cell == config.target:
			reached = true
			break
		if cell.x < 0 or cell.y < 0 or cell.x >= size or cell.y >= size:
			blocked = true
			break
		if cell in config.get("blockers", []):
			blocked = true
			break
		var key := "%d/%d/%d/%d" % [cell.x, cell.y, direction.x, direction.y]
		if visited.has(key):
			cycle = true
			break
		visited[key] = true
		var index: int = config.cells.find(cell)
		if index >= 0:
			direction = Vector2i(-direction.y, -direction.x) if int(orientations[index]) == 0 else Vector2i(direction.y, direction.x)
	return {"beam": beam, "beam_reached": reached, "cycle": cycle, "blocked": blocked}

static func _integer(value: Variant, minimum: int, maximum: int) -> bool:
	return (value is int or value is float) and is_finite(float(value)) and float(value) == floorf(float(value)) and float(value) >= minimum and float(value) <= maximum

static func _integer_array(value: Variant, size: int, minimum: int, maximum: int) -> bool:
	if not value is Array or value.size() != size:
		return false
	for number: Variant in value:
		if not _integer(number, minimum, maximum):
			return false
	return true

static func _ensure() -> void:
	if not _definitions.is_empty():
		return
	# Chapter distribution: 6/6/6/6/6. Every map has two main light mechanisms.
	var layouts := {
		1: {"points": [Vector2(-12.72,7.8),Vector2(6,-3)], "types": ["mirror","balance"], "titles": ["林径折光灯","根旁分流阀"]},
		2: {"points": [Vector2(-10.68,8.84),Vector2(6.6,-3.4)], "types": ["runes","network"], "titles": ["湿羽的来路","树影接灯网"]},
		3: {"points": [Vector2(-8.08,7.28),Vector2(5.6,-2.8)], "types": ["mirror","runes"], "titles": ["门庭回折镜","石门晨刻"]},
		4: {"points": [Vector2(-11.2,8.84),Vector2(6.8,-3.4)], "types": ["balance","network"], "titles": ["栈道潮流阀","雾岸双灯线"]},
		5: {"points": [Vector2(-10.68,9.36),Vector2(6.6,-3.6)], "types": ["mirror","balance"], "titles": ["沉灯浮光镜","湿地导流台"]},
		6: {"points": [Vector2(-10.16,8.84),Vector2(6.4,-3.4)], "types": ["runes","network"], "titles": ["湖面的归星句","湖岸回流环"]},
		7: {"points": [Vector2(-10.16,8.84),Vector2(6.4,-3.4)], "types": ["mirror","runes"], "titles": ["外庭八折镜","石匠的生长刻"]},
		8: {"points": [Vector2(-12.24,9.88),Vector2(7.2,-3.8)], "types": ["balance","network"], "titles": ["回廊倍光阀","余音接灯矩"]},
		9: {"points": [Vector2(-9.64,8.84),Vector2(6.2,-3.4)], "types": ["mirror","balance"], "titles": ["圣库内返镜","档案分光台"]},
		10: {"points": [Vector2(-12.24,9.88),Vector2(7.2,-3.8)], "types": ["runes","network"], "titles": ["归家人的暮刻","街巷互照网"]},
		11: {"points": [Vector2(-10.68,9.36),Vector2(6.6,-3.6)], "types": ["mirror","balance"], "titles": ["工坊回灯镜","旧炉双倍阀"]},
		12: {"points": [Vector2(-9.12,8.84),Vector2(6,-3.4)], "types": ["runes","network"], "titles": ["钟楼夜行刻","钟声四灯线"]},
		13: {"points": [Vector2(-13.28,10.92),Vector2(4,-4.2),Vector2(-2.84,3.36)], "types": ["mirror","network","runes"], "titles": ["根庭归光镜","古根导光网","落叶下的约定"]},
		14: {"points": [Vector2(-11.2,9.88),Vector2(6.8,-3.8),Vector2(-2.2,3.04)], "types": ["balance","runes","mirror"], "titles": ["灯塔稳光阀","守灯人的终刻","圣所余辉镜"]},
	}
	var counters := {"mirror":0,"balance":0,"runes":0,"network":0}
	for map_id in range(1,15):
		var layout: Dictionary = layouts[map_id]
		for index in range(layout.types.size()):
			var type: String = layout.types[index]
			var rank: int = counters[type]
			counters[type] += 1
			var id := "p%02d_%s_%d" % [map_id,type,index + 1]
			var data := {"id":id,"map_id":map_id,"title":layout.titles[index],"description":"","clue":"","type":type,"position":layout.points[index],"required":index < 2,"reward_coins":8 + mini(10, int((map_id - 1) / 2)),"reward_light_growth": 5 if index >= 2 else 0}
			match type:
				"mirror": _make_mirror(data,rank)
				"balance": _make_balance(data,rank)
				"runes": _make_runes(data,rank)
				"network": _make_network(data,rank)
			var region: int = mini(4, int((map_id - 1) / 3))
			var traces: Array = ["青苔掩住了旧铜槽，树根把灯盘托在林径旁。", "水痕留下了潮位，湿木栈道下仍有一股稳定的回光。", "石匠把修补痕迹留在刻槽边，失落的机关仍记得灯从哪里来。", "工坊的铜线与街巷门灯相接，旧城把等候写在了回流里。", "古根和灯塔共用一股缓慢的光，岑灯留下的铜槽在这里汇合。"]
			data.description = str(traces[region]) + str(data.description)
			if type == "network":
				data.config.node_labels = [["根灯","枝灯","路灯","芯灯"],["岸灯","桥灯","浮灯","芯灯"],["庭灯","库灯","门灯","芯灯"],["街灯","炉灯","门灯","芯灯"],["根灯","塔灯","归灯","芯灯"]][region].duplicate()
			_definitions.append(data)
			_by_id[id] = data

static func _turn(cell: Vector2i, size: int) -> Vector2i:
	return Vector2i(size - 1 - cell.y, cell.x)

static func _make_mirror(data: Dictionary, rank: int) -> void:
	var size := 3 if rank < 3 else 4
	var cells: Array[Vector2i]
	var correct: Array[int]
	var source: Vector2i
	var target: Vector2i
	if rank == 0:
		cells = [Vector2i(1,1),Vector2i(1,2),Vector2i(0,2)]
		correct = [1,0,1]
		source = Vector2i(-1,1)
		target = Vector2i(0,-1)
	elif size == 3:
		cells = [Vector2i(0,2),Vector2i(0,0),Vector2i(2,0),Vector2i(2,2),Vector2i(1,2),Vector2i(1,1)]
		correct = [0,0,1,0,1,1]
		source = Vector2i(-1,2)
		target = Vector2i(-1,1)
	else:
		cells = [Vector2i(1,3),Vector2i(1,1),Vector2i(0,1),Vector2i(0,2),Vector2i(3,2),Vector2i(3,0),Vector2i(2,0),Vector2i(2,3)]
		correct = [0,1,0,1,0,1,0,1]
		source = Vector2i(-1,3)
		target = Vector2i(4,3)
	var direction := Vector2i.RIGHT
	for _rotation in range(rank % 4):
		for index in range(cells.size()):
			cells[index] = _turn(cells[index],size)
			correct[index] = 1 - correct[index]
		source = _turn(source,size)
		target = _turn(target,size)
		direction = Vector2i(-direction.y,direction.x)
	var orientations: Array[int] = []
	var path: Array[Dictionary] = []
	for index in range(correct.size()):
		var scramble := (index + rank) % 3 != 1
		orientations.append(1 - correct[index] if scramble else correct[index])
		if scramble:
			path.append({"kind":"rotate","index":index})
	data.config = {"size":size,"cells":cells,"source":source,"source_direction":direction,"target":target,"blockers":[]}
	data.initial_state = {"orientations":orientations,"moves":0}
	data.description = "转动斜镜，让一束光穿过灯盘，落入边缘的铜灯芯。镜片只转折，不创造新的光。"
	data.clue = "铜灯芯藏在另一侧的边缘。光可以再次经过空格，却不能从别的边缘逃走。追踪每一次转折。"
	_secrets[data.id] = correct
	_paths[data.id] = path

static func _make_balance(data: Dictionary, rank: int) -> void:
	var goals := [[3,1,2],[1,3,2],[4,2,3],[2,4,1],[5,2,3],[3,5,2],[4,1,4]]
	var goal: Array = goals[rank % goals.size()]
	var weights: Array = [1,1,1] if rank < 2 else ([1,2,1] if rank % 2 == 0 else [2,1,2])
	var valves: Array = [1,1,1] if rank < 3 else [2,0,1]
	var pair: Array = [0,1] if rank < 4 else [1,2]
	var total := 0
	var path: Array[Dictionary] = []
	for index in range(3):
		total += int(goal[index]) * int(weights[index])
		var delta := 1 if int(goal[index]) > int(valves[index]) else -1
		for _step in range(absi(int(goal[index]) - int(valves[index]))):
			path.append({"kind":"adjust","index":index,"delta":delta})
	var difference := int(goal[int(pair[0])]) - int(goal[int(pair[1])])
	var labels := ["左阀","中阀","右阀"]
	data.config = {"max_power":4 if rank < 2 else 6,"weights":weights,"total":total,"difference":difference,"pair":pair,"labels":labels}
	data.initial_state = {"valves":valves,"moves":0}
	data.description = "三处导光阀分配灯能。总功率与两阀格数差都符合石盘铭文时，灯芯才会稳定。"
	data.clue = "左、中、右阀每格分别送出 %d、%d、%d 单位光。总量应为 %d；%s的格数减去%s的格数应为 %d。" % [weights[0],weights[1],weights[2],total,labels[int(pair[0])],labels[int(pair[1])],difference]
	_secrets[data.id] = goal
	_paths[data.id] = path

static func _make_runes(data: Dictionary, rank: int) -> void:
	var stories := [
		{"pattern":["羽","波","芽","星"],"clue":"湿羽落在水面，涟漪送它靠岸；岸边嫩芽抬头，终于看见暮星。"},
		{"pattern":["石","芽","灯","门"],"clue":"石缝先藏住种子，春芽从中醒来。有人提灯照顾它，再推开门迎来清晨。"},
		{"pattern":["星","波","羽","门"],"clue":"星影来到湖面，波纹惊起栖鸟的羽；等翅声走远，归人推开家门。"},
		{"pattern":["根","石","芽","灯","星"],"clue":"老根把碎石抱住，石隙长出新芽。照料者点灯看它，守到星光升起。"},
		{"pattern":["门","灯","波","羽","星"],"clue":"门前有人点灯，灯影沿水波来到桥下；桥下的羽翼收起，远处的星仍守着路。"},
		{"pattern":["星","灯","门","根","芽"],"clue":"星先替夜行人望路。旅人举灯，越过旧门；门后的老根把新芽护在怀中。"},
		{"pattern":["羽","根","波","石","芽","星"],"clue":"落羽停在古根上，雨水沿根化作波流。流动的小石露出嫩芽，而暮星见证了它抬头。"},
		{"pattern":["门","星","灯","根","芽","门"],"clue":"有人从门中出发，沿星的方向举起灯。古根旁的新芽长大以后，他又回到那扇门。"},
	]
	var story: Dictionary = stories[rank % stories.size()]
	var pattern: Array = story.pattern
	var symbols: Array = GLYPHS.duplicate()
	# Rotated symbol presentation prevents a left-to-right visual answer.
	for _step in range((rank * 3 + 2) % symbols.size()):
		symbols.append(symbols.pop_front())
	data.config = {"symbols":symbols,"length":pattern.size()}
	data.initial_state = {"chosen":[],"moves":0}
	data.description = "石盘没有数字。读懂旁边的短句，按事物发生的先后连接纹样；无关的纹样留在石盘上。"
	data.clue = story.clue
	var path: Array[Dictionary] = []
	for symbol: String in pattern:
		path.append({"kind":"choose","symbol":symbol})
	_secrets[data.id] = pattern.duplicate()
	_paths[data.id] = path

static func _make_network(data: Dictionary, rank: int) -> void:
	var effects: Array = [[3,6,12,8],[9,3,6,4],[5,10,4,8]][rank % 3].duplicate()
	var solutions := [[true,true,false,false],[true,true,false,false],[false,true,true,true],[true,true,true,false],[false,true,false,true],[true,false,true,true],[true,true,false,true]]
	var solution: Array = solutions[rank % solutions.size()]
	var initial_lights: Array = [false,false,false,false]
	if rank >= 3:
		initial_lights[(rank + 1) % 4] = true
	var mask := 0
	for index in range(4):
		if initial_lights[index]:
			mask ^= 1 << index
		if solution[index]:
			mask ^= int(effects[index])
	var target: Array[bool] = []
	for index in range(4):
		target.append((mask & (1 << index)) != 0)
	var danger: Array[Vector2i] = []
	for pair: Vector2i in [Vector2i(0,1),Vector2i(1,2),Vector2i(2,3),Vector2i(0,3),Vector2i(0,2),Vector2i(1,3)]:
		if not (target[pair.x] and target[pair.y]) and danger.size() < (1 if rank < 2 else 2):
			danger.append(pair)
	data.config = {"effects":effects,"initial_lights":initial_lights,"target":target,"danger_pairs":danger,"node_labels":["岸灯","枝灯","门灯","芯灯"]}
	data.initial_state = {"switches":[false,false,false,false],"moves":0}
	data.description = "四个开关各自改变一组灯芯，重叠的光相互抵消。让铜圈标出的灯亮起，并避免红线短接。"
	data.clue = "每根细线显示开关影响的灯；重复翻转会把这一组的光反过来。红线两端不可一起亮。" + ("留意机关起初就有一盏灯亮着。" if rank >= 3 else "")
	var path: Array[Dictionary] = []
	for index in range(4):
		if solution[index]:
			path.append({"kind":"toggle","index":index})
	_secrets[data.id] = solution.duplicate()
	_paths[data.id] = path
