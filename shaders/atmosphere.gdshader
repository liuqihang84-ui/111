shader_type canvas_item;
uniform sampler2D screen_texture : hint_screen_texture, filter_linear_mipmap;

void fragment() {
	vec2 uv = SCREEN_UV;
	float focus = smoothstep(0.14, 0.47, abs(uv.y - 0.53));
	vec3 scene = textureLod(screen_texture, uv, focus * 1.7).rgb;
	float edge = smoothstep(0.24, 0.78, length((uv - 0.5) * vec2(1.05, 0.9)));
	vec3 tint = vec3(0.035, 0.07, 0.085);
	COLOR = vec4(mix(scene, tint, edge * 0.48), 1.0);
}
