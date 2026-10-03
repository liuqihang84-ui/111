extends SceneTree
## Real file I/O in an isolated temporary directory; never touches journey.json.

const Store = preload("res://scripts/progress_store.gd")
const Campaign = preload("res://scripts/campaign_model.gd")

var checks := 0
var failures := 0
var test_directory := ""
var store = Store.new()


func _initialize() -> void:
	call_deferred("_run_tests")


func _check(condition: bool, label: String) -> void:
	checks += 1
	if not condition:
		failures += 1
		printerr("FAIL: ", label)


func _checkpoint() -> Dictionary:
	var model = Campaign.new()
	model.begin()
	model.elapsed = 12.5
	model.coins = 41
	return model.save_data()


func _same_checkpoint(actual: Dictionary, expected: Dictionary) -> bool:
	# JSON numbers load as floats; compare all fields using that wire format.
	return actual == JSON.parse_string(JSON.stringify(expected))


func _write_fixture(text: String) -> bool:
	var file := FileAccess.open(store.path, FileAccess.WRITE)
	if file == null:
		_check(false, "fixture file can be written")
		return false
	file.store_string(text)
	file.close()
	return true


func _run_tests() -> void:
	_check(store.path == "user://journey.json", "default path uses Godot's user data directory")
	test_directory = "/tmp/lumenfall-progress-%d-%d" % [OS.get_process_id(), Time.get_ticks_usec()]
	var creation := DirAccess.make_dir_recursive_absolute(test_directory)
	_check(creation == OK, "isolated checkpoint test directory is created")
	if creation != OK:
		_finish()
		return
	store.path = test_directory.path_join("checkpoint.json")
	_test_missing()
	_test_roundtrip_and_replacement()
	_test_invalid_documents()
	_test_size_limit()
	_test_failed_save_preserves_checkpoint()
	_test_clear()
	_test_nested_directory()
	_test_invalid_path()
	_cleanup()
	_finish()


func _test_missing() -> void:
	_check(store.load_checkpoint().is_empty(), "missing checkpoint loads an empty dictionary")
	_check(not store.has_checkpoint(), "missing checkpoint is not resumable")
	_check(store.clear_checkpoint(), "clearing a missing checkpoint succeeds")


func _test_roundtrip_and_replacement() -> void:
	var first := _checkpoint()
	_check(store.save_checkpoint(first), "complete checkpoint is written")
	_check(store.has_checkpoint() and _same_checkpoint(store.load_checkpoint(), first), "all checkpoint fields survive JSON roundtrip")
	var resumed = Campaign.new()
	_check(resumed.load_data(store.load_checkpoint()) and resumed.coins == 41 and is_equal_approx(resumed.elapsed, 12.5), "stored campaign payload can resume through full semantic validation")
	var second := first.duplicate(true)
	second.health = 80
	second.elapsed = 35.25
	second.coins = 64
	_check(store.save_checkpoint(second), "existing checkpoint is replaced")
	_check(_same_checkpoint(store.load_checkpoint(), second), "replacement contains the newest progress")
	_check(DirAccess.get_files_at(test_directory) == PackedStringArray(["checkpoint.json"]), "successful writes leave no temporary files")


func _test_invalid_documents() -> void:
	for invalid in ["", "{broken json", "[]", "[1, 2]", "null", "false", "42", '"checkpoint"', '{"version": 2}', '{"version": "1"}', '{"version": true}', "{}"]:
		if _write_fixture(invalid):
			_check(store.load_checkpoint().is_empty() and not store.has_checkpoint(), "invalid document is rejected: " + invalid)
	if _write_fixture('{"version": 1.0}'):
		_check(store.has_checkpoint(), "JSON numeric version is accepted without requiring integer storage")
	if _write_fixture('{"version": 1, "position": "invalid gameplay state"}'):
		_check(store.has_checkpoint(), "store leaves full gameplay validation to GameModel")


func _test_size_limit() -> void:
	var minimal := '{"version": 1}'
	if _write_fixture(minimal + " ".repeat(Store.MAX_CHECKPOINT_BYTES - minimal.to_utf8_buffer().size())):
		_check(store.has_checkpoint(), "a valid document at the 64 KiB limit loads")
	if _write_fixture(minimal + " ".repeat(Store.MAX_CHECKPOINT_BYTES)):
		_check(store.load_checkpoint().is_empty() and not store.has_checkpoint(), "files over 64 KiB are rejected before parsing")


func _test_failed_save_preserves_checkpoint() -> void:
	var original := _checkpoint()
	_check(store.save_checkpoint(original), "baseline checkpoint is restored")
	var unsupported := original.duplicate(true)
	unsupported.version = 2
	_check(not store.save_checkpoint(unsupported) and _same_checkpoint(store.load_checkpoint(), original), "unsupported save version preserves the previous checkpoint")
	var oversized := original.duplicate(true)
	oversized.payload = "x".repeat(Store.MAX_CHECKPOINT_BYTES)
	_check(not store.save_checkpoint(oversized) and _same_checkpoint(store.load_checkpoint(), original), "oversized save preserves the previous checkpoint")
	var original_path: String = store.path
	store.path = test_directory.path_join("blocked.json")
	DirAccess.make_dir_absolute(store.path)
	_check(not store.save_checkpoint(original), "a directory cannot be replaced by a checkpoint file")
	_check(not store.clear_checkpoint() and DirAccess.dir_exists_absolute(store.path), "clear preserves a directory at the checkpoint path")
	DirAccess.remove_absolute(store.path)
	store.path = original_path
	_check(_same_checkpoint(store.load_checkpoint(), original), "a failed save at another path leaves the real checkpoint intact")
	_check(DirAccess.get_files_at(test_directory) == PackedStringArray(["checkpoint.json"]), "failed writes leave no partial temporary files")


func _test_clear() -> void:
	_check(store.clear_checkpoint(), "saved checkpoint is cleared")
	_check(not FileAccess.file_exists(store.path) and not store.has_checkpoint(), "clear removes the saved file and resume availability")
	_check(store.clear_checkpoint(), "clear is idempotent")
	if _write_fixture("corrupt"):
		_check(store.clear_checkpoint() and not FileAccess.file_exists(store.path), "a corrupt checkpoint can also be cleared")


func _test_nested_directory() -> void:
	store.path = test_directory.path_join("nested/checkpoint.json")
	_check(store.save_checkpoint(_checkpoint()) and store.has_checkpoint(), "save creates a missing parent directory")
	_check(store.clear_checkpoint(), "injected nested checkpoint path can be cleared")
	DirAccess.remove_absolute(test_directory.path_join("nested"))


func _test_invalid_path() -> void:
	store.path = ""
	_check(not store.save_checkpoint(_checkpoint()) and store.load_checkpoint().is_empty() and not store.has_checkpoint() and not store.clear_checkpoint(), "empty path fails safely without file I/O")


func _cleanup() -> void:
	if test_directory.is_empty():
		return
	for filename in DirAccess.get_files_at(test_directory):
		DirAccess.remove_absolute(test_directory.path_join(filename))
	_check(DirAccess.remove_absolute(test_directory) == OK, "isolated test directory is cleaned up")


func _finish() -> void:
	print("ProgressStore: ", checks - failures, "/", checks, " checks passed")
	quit(1 if failures > 0 else 0)
