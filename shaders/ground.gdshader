shader_type spatial;
render_mode diffuse_burley;
varying vec3 world_position;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void vertex() {
	world_position = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	vec2 tile = floor(world_position.xz * 9.0);
	float grain = hash(tile);
	vec3 moss = mix(vec3(0.085, 0.17, 0.15), vec3(0.15, 0.25, 0.19), grain);
	float path_distance = abs(world_position.z + world_position.x * 0.62 - 0.15 - sin(world_position.x * 0.7) * 0.6);
	float path = 1.0 - smoothstep(0.55, 1.35, path_distance);
	vec3 earth = mix(vec3(0.20, 0.24, 0.20), vec3(0.28, 0.30, 0.23), grain);
	ALBEDO = mix(moss, earth, path * 0.75);
	ROUGHNESS = 0.95;
}
