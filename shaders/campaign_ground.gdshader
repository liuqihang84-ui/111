shader_type spatial;
render_mode diffuse_burley, specular_disabled;

uniform vec4 ground_color : source_color = vec4(0.20, 0.34, 0.29, 1.0);
uniform vec4 path_color : source_color = vec4(0.16, 0.28, 0.30, 1.0);
uniform sampler2D route_mask : filter_linear, repeat_disable;
uniform sampler2D ground_texture : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D path_texture : source_color, filter_linear_mipmap, repeat_enable;
uniform bool textured_terrain = false;
uniform vec3 ground_tint = vec3(0.76, 0.88, 0.98);
uniform vec3 path_tint = vec3(1.05, 0.94, 0.79);
uniform float path_tile_size = 3.5;
uniform vec2 lantern_position = vec2(0.0);
uniform vec4 lantern_color : source_color = vec4(1.0, 0.8, 0.48, 1.0);
uniform float lantern_radius = 1.85;
uniform float lantern_energy = 0.0;
uniform float flow_time = 0.0;
uniform vec2 map_origin = vec2(-24.0, -18.0);
uniform vec2 map_size = vec2(48.0, 36.0);
uniform float variation : hint_range(0.0, 0.2) = 0.06;
varying vec3 world_position;

void vertex() {
    world_position = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
    vec2 cell = floor(p);
    vec2 fraction = fract(p);
    fraction = fraction * fraction * (3.0 - 2.0 * fraction);
    return mix(mix(hash(cell), hash(cell + vec2(1.0, 0.0)), fraction.x),
               mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0)), fraction.x), fraction.y);
}

void fragment() {
    // Continuous terrain detail replaces the visible diamond/checker pattern.
    float patch = noise(world_position.xz * 0.43);
    float detail = noise(world_position.xz * 7.5);
    float shade = 0.95 + patch * 0.1 + (detail - 0.5) * variation;
    vec2 route_uv = (world_position.xz - map_origin) / map_size;
    vec4 mask = texture(route_mask, route_uv);
    float coverage = max(mask.r, mask.g * 0.65);
    coverage = clamp(coverage + (detail - 0.5) * 0.055 * coverage * (1.0 - coverage), 0.0, 1.0);
    vec3 earth = ground_color.rgb * shade;
    vec3 trail = path_color.rgb * (0.92 + detail * 0.13);
    if (textured_terrain) {
        // Source textures already carry their color. Multiplying them by the
        // old dark teal ground color would crush both moss and soil detail.
        earth = texture(ground_texture, world_position.xz / 5.0).rgb * ground_tint;
        trail = texture(path_texture, world_position.xz / path_tile_size).rgb * path_tint;
    }
    float canopy = mask.a * (0.38 + noise(world_position.xz * 2.4) * 0.42);
    vec3 terrain = mix(earth, trail, coverage) * (1.0 - canopy);
    float water = mask.b * (1.0 - mask.r * 0.97);
    float flow = noise(world_position.xz * 2.6 + vec2(flow_time * 0.11, -flow_time * 0.17));
    float ripple = smoothstep(0.72, 0.93, noise(world_position.xz * vec2(8.7, 1.9) + vec2(flow_time * 0.45, flow_time * 0.12)));
    vec3 creek = vec3(0.13, 0.285, 0.34) * (0.88 + flow * 0.16) + vec3(0.025, 0.046, 0.05) * ripple;
    ALBEDO = mix(terrain, creek, water);
    // Fragment-space lighting keeps the lantern's footprint round and soft on
    // a large low-poly floor. Warm emission remains readable in cool ambience
    // without relying on renderer-specific bloom or post-processing.
    float lantern_falloff = 1.0 - smoothstep(0.0, lantern_radius, distance(world_position.xz, lantern_position));
    lantern_falloff *= lantern_falloff;
    EMISSION = lantern_color.rgb * lantern_energy * lantern_falloff * (0.7 + detail * 0.3);
    ROUGHNESS = 1.0;
}
