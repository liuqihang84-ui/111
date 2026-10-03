shader_type spatial;
render_mode diffuse_burley, specular_disabled;

uniform vec4 ground_color : source_color = vec4(0.20, 0.34, 0.29, 1.0);
uniform vec4 path_color : source_color = vec4(0.16, 0.28, 0.30, 1.0);
uniform sampler2D route_mask : filter_linear, repeat_disable;
uniform vec2 map_origin = vec2(-24.0, -18.0);
uniform vec2 map_size = vec2(48.0, 36.0);
uniform float variation : hint_range(0.0, 0.2) = 0.06;
varying vec3 world_position;

void vertex() {
    world_position = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
    // Broad, quiet patches preserve route readability and crisp sprite edges.
    vec2 cell = floor(world_position.xz * 0.7);
    float patch = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
    float shade = 1.0 + (floor(patch * 3.0) - 1.0) * variation;
    vec2 route_uv = (world_position.xz - map_origin) / map_size;
    float coverage = texture(route_mask, route_uv).r;
    vec2 grain_cell = floor(world_position.xz * 2.0);
    float grain = fract(sin(dot(grain_cell, vec2(15.13, 91.71))) * 17337.17);
    ALBEDO = mix(ground_color.rgb * shade, path_color.rgb * (0.97 + floor(grain * 3.0) * 0.018), coverage);
    ROUGHNESS = 1.0;
}
