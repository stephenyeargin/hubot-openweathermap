# OpenWeatherMap for Hubot

Retrieves the current conditions for a configured location or by query.

## Installation

In your hubot repository, run:

`npm install hubot-openweathermap --save`

Then add **hubot-openweathermap** to your `external-scripts.json`:

```json
["hubot-openweathermap"]
```

### Configuration

| Environment Variables    | Required? | Description                              |
| ------------------------ | :-------: | ---------------------------------------- |
| `HUBOT_OPEN_WEATHER_MAP_API_KEY`  | Yes       | API key from the developer console       |
| `HUBOT_DEFAULT_LATITUDE` | No | Latitude for default query of `hubot weather` |
| `HUBOT_DEFAULT_LONGITUDE` | No | Longitude for default query of `hubot weather` |

## Usage

```
user1> hubot weather
hubot> Currently Clouds and 49F/10C in Nashville
```
