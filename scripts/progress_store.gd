extends RefCounted
## A bounded JSON checkpoint store. GameModel validates the gameplay fields.

const CHECKPOINT_VERSION := 1
const MAX_CHECKPOINT_BYTES := 64 * 1024

var path: String = "user://journey.json"


func save_checkpoint(data: Dictionary) -> bool:
	if not _supported_version(data) or path.is_empty():
		return false
	var bytes := JSON.stringify(data).to_utf8_buffer()
	if bytes.is_empty() or bytes.size() > MAX_CHECKPOINT_BYTES:
		return false
	var destination := _absolute_path()
	if DirAccess.dir_exists_absolute(destination):
		return false
	if DirAccess.make_dir_recursive_absolute(destination.get_base_dir()) != OK:
		return false
	# Both files live in the same directory so replacement is an atomic rename.
	# The existing checkpoint is never removed before a replacement is ready.
	var temporary := "%s.tmp-%d-%d" % [destination, OS.get_process_id(), Time.get_ticks_usec()]
	var file := FileAccess.open(temporary, FileAccess.WRITE)
	if file == null:
		return false
	file.store_buffer(bytes)
	file.flush()
	var write_error := file.get_error()
	file.close()
	if write_error != OK:
		DirAccess.remove_absolute(temporary)
		return false
	if DirAccess.rename_absolute(temporary, destination) != OK:
		DirAccess.remove_absolute(temporary)
		return false
	return true


func load_checkpoint() -> Dictionary:
	if path.is_empty() or not FileAccess.file_exists(path):
		return {}
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		return {}
	var length := file.get_length()
	if length <= 0 or length > MAX_CHECKPOINT_BYTES:
		file.close()
		return {}
	# Bound the read too, in case the file changes after its length was checked.
	var bytes := file.get_buffer(MAX_CHECKPOINT_BYTES + 1)
	var read_error := file.get_error()
	file.close()
	if bytes.is_empty() or bytes.size() > MAX_CHECKPOINT_BYTES:
		return {}
	if read_error != OK and read_error != ERR_FILE_EOF:
		return {}
	var document := JSON.new()
	if document.parse(bytes.get_string_from_utf8()) != OK:
		return {}
	if typeof(document.data) != TYPE_DICTIONARY:
		return {}
	var data: Dictionary = document.data
	return data if _supported_version(data) else {}


func has_checkpoint() -> bool:
	return not load_checkpoint().is_empty()


func clear_checkpoint() -> bool:
	if path.is_empty():
		return false
	var destination := _absolute_path()
	if DirAccess.dir_exists_absolute(destination):
		return false
	if not FileAccess.file_exists(destination):
		return true
	return DirAccess.remove_absolute(destination) == OK


func _supported_version(data: Dictionary) -> bool:
	var version = data.get("version")
	if typeof(version) != TYPE_INT and typeof(version) != TYPE_FLOAT:
		return false
	return version == CHECKPOINT_VERSION


func _absolute_path() -> String:
	var destination := ProjectSettings.globalize_path(path)
	if not destination.is_absolute_path():
		destination = ProjectSettings.globalize_path("res://").path_join(destination)
	return destination.simplify_path()
