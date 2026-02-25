# OpenWeatherMap for Hubot

Retrieves the current conditions for a configured location or by query.

[![npm version](https://badge.fury.io/js/@stephenyeargin%2Fhubot-openweathermap.svg)](https://badge.fury.io/js/@stephenyeargin%2Fhubot-openweathermap) [![Node CI](https://github.com/stephenyeargin/hubot-openweathermap/actions/workflows/nodejs.yml/badge.svg)](https://github.com/stephenyeargin/hubot-openweathermap/actions/workflows/nodejs.yml)

## Installation

In your hubot repository, run:

`npm install @stephenyeargin/hubot-openweathermap --save`

Then add **@stephenyeargin/hubot-openweathermap** to your `external-scripts.json`:

```json
[
  "@stephenyeargin/hubot-openweathermap"
]
```

### Configuration

| Environment Variables    | Required? | Description                              |
| ------------------------ | :-------: | ---------------------------------------- |
| `HUBOT_OPEN_WEATHER_MAP_API_KEY`  | Yes | API key from the developer console |
| `HUBOT_DEFAULT_LATITUDE` | No | Latitude for default query of `hubot weather` |
| `HUBOT_DEFAULT_LONGITUDE` | No | Longitude for default query of `hubot weather` |
| `HUBOT_OPEN_WEATHER_OLLAMA_ENABLED` | No | Set to `true` to enable Ollama tool integration (requires `hubot-ollama`) |

## Usage

```
user1> hubot weather
hubot> Currently scattered clouds and 49F/10C
```

### Slack

![screenshot](screenshot.png)

## Ollama Integration

This package can expose weather tools to [Ollama](https://ollama.ai/) for use in LLM-powered conversations through the [`hubot-ollama`](https://github.com/stephenyeargin/hubot-ollama) package.

### Enabling Ollama Tools

To enable this feature, set the following environment variable:

```bash
HUBOT_OPEN_WEATHER_OLLAMA_ENABLED=true
```

This requires `hubot-ollama` to be installed in your hubot repository. If `hubot-ollama` is not available, the tools will not be registered but the package will continue to function normally.

### Available Tools

#### `get_current_weather`

Retrieves current weather conditions for a specified location.

**Parameters:**
- `location` (string, required): Location to get weather for. Can be a city name, city/state, city/country, or ZIP code (e.g., "Denver, CO", "London", "75001")

**Returns:**
- Location name
- Current conditions (description)
- Temperature in Fahrenheit and Celsius
- Feels-like temperature
- Humidity percentage
- Wind speed
- UV index
- Active weather alerts (if any)

#### `reverse_geocode_weather`

Retrieves weather for given latitude and longitude coordinates, including the location name.

**Parameters:**
- `latitude` (number, required): Latitude coordinate
- `longitude` (number, required): Longitude coordinate

**Returns:**
- Location name (from reverse geocoding)
- Coordinates
- Current conditions and weather data (same as `get_current_weather`)
- Active weather alerts (if any)

### Example Usage in Ollama

When Ollama tools are enabled, you can use weather information in LLM conversations:

```
user> What's the weather like in Denver and is it worse than London?
llm> [uses get_current_weather tool for both locations]
llm> Denver is currently 45°F with clear skies, while London is 38°F with cloudy conditions. Denver has better weather!
```
