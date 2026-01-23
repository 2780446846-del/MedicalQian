export const API_CONFIG = {
  BASE_URL: 'http://localhost:3001/api/deepseek/chat',
  API_KEY: 'sk-0acca75db12c4c7db077ac2d78b2b69d',
  TIMEOUT: 30000,
  DEFAULT_MODEL: 'deepseek-chat',
  DEFAULT_TEMPERATURE: 0.3,
  DEFAULT_MAX_TOKENS: 500,
  DEFAULT_TOP_P: 0.8,
  WEATHER_API_URL: 'https://api.openweathermap.org/data/2.5/weather',
  WEATHER_API_KEY: 'YOUR_OPENWEATHERMAP_API_KEY',
  DEFAULT_CITY: 'Beijing,CN'
};

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface APIError {
  status: number;
  message: string;
  details?: Record<string, unknown>;
}

export type WeatherData = {
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
  };
  name: string;
  dt: number;
};

export type ForecastDay = {
  date: string;
  day: {
    temp_max: number;
    temp_min: number;
    humidity: number;
    wind_speed: number;
    weather: Array<{
      main: string;
      description: string;
      icon: string;
    }>;
  };
};

export type ForecastData = {
  city: string;
  forecast: ForecastDay[];
};

export interface GeolocationData {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

export const WEATHER_TYPES = {
  SUNNY: "晴",
  CLOUDY: "多云",
  OVERCAST: "阴",
  RAIN: "雨",
  SNOW: "雪",
  FOG: "雾",
  THUNDERSTORM: "雷阵雨",
  DEFAULT: "未知"
} as const;

export type WeatherType = typeof WEATHER_TYPES[keyof typeof WEATHER_TYPES];

export class AIClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly weatherApiUrl: string;
  private readonly weatherApiKey: string;
  private currentCity: string;
  private cachedGeolocation: GeolocationData | null = null;
  private manualLocation: GeolocationData | null = null;

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
    this.apiKey = API_CONFIG.API_KEY;
    this.timeout = API_CONFIG.TIMEOUT;
    this.weatherApiUrl = API_CONFIG.WEATHER_API_URL;
    this.weatherApiKey = API_CONFIG.WEATHER_API_KEY;
    this.currentCity = API_CONFIG.DEFAULT_CITY;
  }

  public setManualLocation(location: GeolocationData): void {
    this.manualLocation = location;
  }

  public getManualLocation(): GeolocationData | null {
    return this.manualLocation;
  }

  public clearManualLocation(): void {
    this.manualLocation = null;
  }

  public isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== 'YOUR_OPENAI_API_KEY';
  }

  public updateCurrentCity(city: string): void {
    this.currentCity = city;
  }

  public getCurrentCity(): string {
    return this.currentCity;
  }

  public async getCurrentLocation(): Promise<GeolocationData | null> {
    try {
      if (this.manualLocation && this.manualLocation.latitude && this.manualLocation.longitude) {
        return this.manualLocation;
      }

      if (this.cachedGeolocation && this.cachedGeolocation.latitude && this.cachedGeolocation.longitude) {
        return this.cachedGeolocation;
      }

      if (!navigator.geolocation) {
        throw new Error('您的浏览器不支持地理位置服务');
      }

      return new Promise<GeolocationData>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const geolocationData: GeolocationData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            };
            this.cachedGeolocation = geolocationData;
            resolve(geolocationData);
          },
          (error) => {
            let errorMessage = '获取地理位置失败';
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = '您拒绝了地理位置请求，请在浏览器设置中允许访问位置';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = '位置信息不可用，请检查您的网络连接或定位服务是否开启';
                break;
              case error.TIMEOUT:
                errorMessage = '获取位置信息超时，请稍后重试';
                break;
              default:
                errorMessage = `获取位置时发生未知错误: ${error.message}`;
                break;
            }
            this.cachedGeolocation = null;
            reject(new Error(errorMessage));
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 300000
          }
        );
      });
    } catch (error) {
      this.cachedGeolocation = null;
      throw error instanceof Error ? error : new Error('获取地理位置时发生异常');
    }
  }

  public async getWeather(city: string = this.currentCity, geolocation?: GeolocationData): Promise<WeatherData> {
    try {
      if (!this.weatherApiKey || this.weatherApiKey === 'YOUR_OPENWEATHERMAP_API_KEY') {
        let cityName = '北京';

        if (geolocation && geolocation.latitude && geolocation.longitude) {
          const { latitude, longitude } = geolocation;
          if (latitude >= 36.08 && latitude <= 42.67 && longitude >= 113.45 && longitude <= 119.83) {
            cityName = '河北';
          }
        } else if (city) {
          cityName = city.split(',')[0];
        }

        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const isWinter = [12, 1, 2].includes(currentMonth);

        let mockWeatherData;
        if (isWinter) {
          mockWeatherData = {
            name: cityName,
            main: {
              temp: -2,
              feels_like: -5,
              humidity: 45
            },
            weather: [{
              main: 'Clear',
              description: '晴朗',
              icon: '01d'
            }],
            wind: {
              speed: 3.5
            },
            dt: Math.floor(Date.now() / 1000)
          };
        } else {
          const month = now.getMonth() + 1;
          const random = Math.random();
          let weatherType: string;
          let weatherDesc: string;
          let icon: string;

          if (month >= 3 && month <= 5) {
            if (random < 0.6) {
              weatherType = 'Clear';
              weatherDesc = '晴朗';
              icon = '01d';
            } else if (random < 0.8) {
              weatherType = 'Clouds';
              weatherDesc = '多云';
              icon = '03d';
            } else {
              weatherType = 'Rain';
              weatherDesc = '小雨';
              icon = '09d';
            }
          } else if (month >= 6 && month <= 8) {
            if (random < 0.5) {
              weatherType = 'Clear';
              weatherDesc = '晴朗';
              icon = '01d';
            } else if (random < 0.8) {
              weatherType = 'Clouds';
              weatherDesc = '多云';
              icon = '03d';
            } else {
              weatherType = 'Thunderstorm';
              weatherDesc = '雷阵雨';
              icon = '11d';
            }
          } else if (month >= 9 && month <= 11) {
            if (random < 0.7) {
              weatherType = 'Clear';
              weatherDesc = '晴朗';
              icon = '01d';
            } else {
              weatherType = 'Clouds';
              weatherDesc = '多云';
              icon = '03d';
            }
          } else {
            weatherType = 'Clear';
            weatherDesc = '晴朗';
            icon = '01d';
          }

          mockWeatherData = {
            name: cityName,
            main: {
              temp: 18,
              feels_like: 17,
              humidity: 55
            },
            weather: [{
              main: weatherType,
              description: weatherDesc,
              icon: icon
            }],
            wind: {
              speed: 2.5
            },
            dt: Math.floor(Date.now() / 1000)
          };
        }

        return mockWeatherData;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      let weatherUrl: string;
      if (geolocation && geolocation.latitude && geolocation.longitude) {
        weatherUrl = `${this.weatherApiUrl}?lat=${geolocation.latitude}&lon=${geolocation.longitude}&appid=${this.weatherApiKey}&units=metric&lang=zh_cn`;
      } else {
        weatherUrl = `${this.weatherApiUrl}?q=${encodeURIComponent(city)}&appid=${this.weatherApiKey}&units=metric&lang=zh_cn`;
      }

      const response = await fetch(weatherUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`天气API请求失败: ${response.status} ${response.statusText}`);
      }

      const weatherData: WeatherData = await response.json();
      return weatherData;
    } catch (error) {
      console.error('获取天气信息失败:', error);

      let cityName = '北京';

      if (geolocation && geolocation.latitude && geolocation.longitude) {
        const { latitude, longitude } = geolocation;
        if (latitude >= 36.08 && latitude <= 42.67 && longitude >= 113.45 && longitude <= 119.83) {
          cityName = '河北';
        }
      } else if (city) {
        cityName = city.split(',')[0];
      }

      const isWinter = [12, 1, 2].includes(new Date().getMonth() + 1);

      const mockWeatherData = {
        name: cityName,
        main: {
          temp: isWinter ? -2 : 18,
          feels_like: isWinter ? -5 : 17,
          humidity: isWinter ? 45 : 55
        },
        weather: [{
          main: 'Clear',
          description: '晴朗',
          icon: '01d'
        }],
        wind: {
          speed: isWinter ? 3.5 : 2.5
        },
        dt: Math.floor(Date.now() / 1000)
      };

      return mockWeatherData;
    }
  }

  public formatWeatherText(weatherData: WeatherData): string {
    return `当前${weatherData.name}的天气：${weatherData.weather[0].description}，温度${weatherData.main.temp}°C，体感温度${weatherData.main.feels_like}°C，湿度${weatherData.main.humidity}%，风速${weatherData.wind.speed}m/s`;
  }

  public async getForecast(city: string = this.currentCity): Promise<ForecastData> {
    try {
      if (!this.weatherApiKey || this.weatherApiKey === 'YOUR_OPENWEATHERMAP_API_KEY') {
        const cityName = city.split(',')[0] || '北京';
        const forecast: ForecastDay[] = [];
        const today = new Date();
        const isWinter = [12, 1, 2].includes(today.getMonth() + 1);

        for (let i = 0; i < 7; i++) {
          const forecastDate = new Date(today);
          forecastDate.setDate(today.getDate() + i);

          const randomIndex = Math.floor(Math.random() * 3);
          const weatherTypes = ['Clear', 'Clouds', 'Clouds', 'Rain', 'Snow', 'Thunderstorm'];
          const weatherDescs = ['晴朗', '多云', '阴天', '小雨', '小雪', '雷阵雨'];
          const weatherType = weatherTypes[randomIndex];
          const weatherDesc = weatherDescs[randomIndex];

          let baseTemp = isWinter ? -5 : 15;
          if (weatherType === 'Rain') baseTemp -= 5;
          if (weatherType === 'Snow') baseTemp -= 8;

          forecast.push({
            date: forecastDate.toISOString().split('T')[0],
            day: {
              temp_max: baseTemp + Math.floor(Math.random() * 8) + 2,
              temp_min: baseTemp - Math.floor(Math.random() * 5) - 2,
              humidity: 40 + Math.floor(Math.random() * 30),
              wind_speed: 2 + Math.random() * 5,
              weather: [{
                main: weatherType,
                description: weatherDesc,
                icon: '01d'
              }]
            }
          });
        }

        return {
          city: cityName,
          forecast
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast/daily?q=${encodeURIComponent(city)}&cnt=7&appid=${this.weatherApiKey}&units=metric&lang=zh_cn`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          },
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`天气预报API请求失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      const forecast: ForecastDay[] = data.list.map((day: { dt: number; temp: { max: number; min: number }; humidity: number; speed: number; weather: Array<{ main: string; description: string; icon: string }> }) => ({
        date: new Date(day.dt * 1000).toISOString().split('T')[0],
        day: {
          temp_max: day.temp.max,
          temp_min: day.temp.min,
          humidity: day.humidity,
          wind_speed: day.speed,
          weather: day.weather
        }
      }));

      return {
        city: data.city.name,
        forecast
      };
    } catch (error) {
      console.error('获取天气预报失败:', error);

      const cityName = city.split(',')[0] || '北京';
      const today = new Date();
      const isWinter = [12, 1, 2].includes(today.getMonth() + 1);

      const forecast: ForecastDay[] = [];
      for (let i = 0; i < 7; i++) {
        const forecastDate = new Date(today);
        forecastDate.setDate(today.getDate() + i);

        forecast.push({
          date: forecastDate.toISOString().split('T')[0],
          day: {
            temp_max: isWinter ? 0 + Math.floor(Math.random() * 5) : 20 + Math.floor(Math.random() * 10),
            temp_min: isWinter ? -8 + Math.floor(Math.random() * 5) : 10 + Math.floor(Math.random() * 5),
            humidity: 40 + Math.floor(Math.random() * 30),
            wind_speed: 2 + Math.random() * 5,
            weather: [{
              main: 'Clear',
              description: '晴朗',
              icon: '01d'
            }]
          }
        });
      }

      return {
        city: cityName,
        forecast
      };
    }
  }

  public async sendChatRequest(
    messages: ChatMessage[],
    options?: {
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
    },
    signal?: AbortSignal
  ): Promise<string> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const request: ChatCompletionRequest = {
        model: API_CONFIG.DEFAULT_MODEL,
        messages: messages,
        temperature: options?.temperature ?? API_CONFIG.DEFAULT_TEMPERATURE,
        max_tokens: options?.max_tokens ?? API_CONFIG.DEFAULT_MAX_TOKENS,
        top_p: options?.top_p ?? API_CONFIG.DEFAULT_TOP_P
      };

      console.log('发送API请求:', JSON.stringify(request, null, 2));
      console.log('请求URL:', this.baseUrl);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(request),
        signal: signal || controller.signal
      });

      clearTimeout(timeoutId);

      console.log('响应状态:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API请求失败:', response.status, errorText);
        throw new Error(`API请求失败: ${response.status} ${errorText}`);
      }

      const data: ChatCompletionResponse = await response.json();
      console.log('API响应:', data);

      if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content;
      }

      throw new Error('API返回数据格式错误');
    } catch (error) {
      console.error('发送聊天请求失败:', error);
      throw error instanceof Error ? error : new Error('发送聊天请求失败');
    }
  }
}

export const aiClient = new AIClient();
