/**
 * Mango AI — Production Weather Module
 * Open-Meteo API
 *
 * Priority:
 * 1. พิกัดสวนที่ส่งเข้ามา
 * 2. GPS ของอุปกรณ์
 * 3. พิกัด fallback จาก CONFIG
 *
 * Features:
 * - อุณหภูมิ
 * - ความชื้น
 * - ลม
 * - สภาพอากาศภาษาไทย
 * - สถานะ GPS / พิกัดสวน
 * - เวลาอัปเดต
 * - Auto refresh ทุก 15 นาที
 * - Error fallback
 */

const WEATHER = {
    // ใช้พิกัดจาก CONFIG เป็น fallback เพื่อไม่ hard-code กรุงเทพฯ
    defaultLat: (typeof CONFIG !== 'undefined' && Number.isFinite(Number(CONFIG.DEFAULT_LAT)))
        ? Number(CONFIG.DEFAULT_LAT)
        : 13.7563,
    defaultLng: (typeof CONFIG !== 'undefined' && Number.isFinite(Number(CONFIG.DEFAULT_LNG)))
        ? Number(CONFIG.DEFAULT_LNG)
        : 100.5018,

    refreshInterval: 15 * 60 * 1000,

    isValidCoordinate(lat, lng) {
        return (
            Number.isFinite(Number(lat)) &&
            Number.isFinite(Number(lng)) &&
            Number(lat) >= -90 &&
            Number(lat) <= 90 &&
            Number(lng) >= -180 &&
            Number(lng) <= 180
        );
    },

    async getCurrentLocation() {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve({
                    lat: this.defaultLat,
                    lng: this.defaultLng,
                    source: 'fallback'
                });
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    resolve({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracy: pos.coords.accuracy,
                        source: 'gps'
                    });
                },
                () => {
                    resolve({
                        lat: this.defaultLat,
                        lng: this.defaultLng,
                        source: 'fallback'
                    });
                },
                {
                    enableHighAccuracy: true,
                    timeout: 8000,
                    maximumAge: 300000
                }
            );
        });
    },

    getWeatherDescription(code) {
        const codes = {
            0: 'แจ่มใส',
            1: 'โปร่งเป็นส่วนใหญ่',
            2: 'มีเมฆบางส่วน',
            3: 'มืดครึ้ม',
            45: 'มีหมอก',
            48: 'มีหมอกจับตัวเป็นน้ำแข็ง',
            51: 'ฝนตกปรอยๆ เล็กน้อย',
            53: 'ฝนตกปรอยๆ ปานกลาง',
            55: 'ฝนตกปรอยๆ หนัก',
            56: 'ฝนเยือกแข็งปรอยๆ',
            57: 'ฝนเยือกแข็ง',
            61: 'ฝนตกเล็กน้อย',
            63: 'ฝนตกปานกลาง',
            65: 'ฝนตกหนัก',
            66: 'ฝนเยือกแข็งเล็กน้อย',
            67: 'ฝนเยือกแข็งหนัก',
            71: 'หิมะตกเล็กน้อย',
            73: 'หิมะตกปานกลาง',
            75: 'หิมะตกหนัก',
            77: 'เกล็ดหิมะ',
            80: 'ฝนซู่เล็กน้อย',
            81: 'ฝนซู่ปานกลาง',
            82: 'ฝนซู่หนัก',
            85: 'หิมะซู่เล็กน้อย',
            86: 'หิมะซู่หนัก',
            95: 'พายุฝนฟ้าคะนอง',
            96: 'พายุฝนฟ้าคะนองและลูกเห็บ',
            99: 'พายุฝนฟ้าคะนองรุนแรง'
        };

        return codes[code] || 'สภาพอากาศทั่วไป';
    },

    async fetchWeather(lat, lng) {
        try {
            if (!this.isValidCoordinate(lat, lng)) {
                throw new Error('Invalid coordinates');
            }

            const params = new URLSearchParams({
                latitude: lat,
                longitude: lng,
                current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
                timezone: 'auto'
            });

            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
                {
                    method: 'GET',
                    headers: { Accept: 'application/json' }
                }
            );

            if (!response.ok) {
                throw new Error(`Weather API Error: ${response.status}`);
            }

            const data = await response.json();
            if (!data.current) {
                throw new Error('Invalid weather response');
            }

            return {
                temp: Math.round(data.current.temperature_2m),
                humidity: Math.round(data.current.relative_humidity_2m),
                wind: Math.round(data.current.wind_speed_10m),
                weatherCode: data.current.weather_code,
                condition: this.getWeatherDescription(data.current.weather_code),
                timezone: data.timezone,
                updatedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('[Mango AI Weather]', error);
            return null;
        }
    },

    renderLocationStatus(location) {
        const statusEl = document.getElementById('weather-location-status');
        const locationEl = document.getElementById('weather-location');

        const label = location.source === 'orchard'
            ? '📍 พิกัดสวน'
            : location.source === 'gps'
                ? '📍 GPS ปัจจุบัน'
                : '📍 พิกัดสำรอง';

        if (statusEl) statusEl.textContent = label;
        if (locationEl) locationEl.textContent = label;
    },

    renderUpdatedTime(time) {
        const updatedEl = document.getElementById('weather-updated');
        if (!updatedEl) return;

        try {
            const date = new Date(time);
            updatedEl.textContent = `อัปเดต ${date.toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit'
            })}`;
        } catch {
            updatedEl.textContent = 'อัปเดตล่าสุด';
        }
    },

    renderUI(data) {
        const tempEl = document.getElementById('weather-temp');
        const humidityEl = document.getElementById('weather-humidity');
        const windEl = document.getElementById('weather-wind');
        const conditionEl = document.getElementById('weather-condition');
        const descEl = document.getElementById('weather-desc');

        if (tempEl) tempEl.textContent = `${data.temp}°C`;
        if (humidityEl) humidityEl.textContent = `${data.humidity}%`;
        if (windEl) windEl.textContent = `${data.wind} km/h`;
        if (conditionEl) conditionEl.textContent = data.condition;

        // รองรับ Dashboard รุ่นปัจจุบันที่มี weather-desc แทน
        // weather-humidity / weather-wind / weather-condition
        if (descEl) {
            descEl.textContent = `${data.condition} / ความชื้น ${data.humidity}% / ลม ${data.wind} km/h`;
        }

        this.renderUpdatedTime(data.updatedAt);
    },

    renderError() {
        const conditionEl = document.getElementById('weather-condition');
        const descEl = document.getElementById('weather-desc');

        if (conditionEl) conditionEl.textContent = 'ไม่สามารถโหลดข้อมูลอากาศ';
        if (descEl) descEl.textContent = 'ไม่สามารถโหลดข้อมูลอากาศจาก Open-Meteo';
    },

    async init(orchardLat = null, orchardLng = null) {
        let location;

        if (this.isValidCoordinate(orchardLat, orchardLng)) {
            location = {
                lat: Number(orchardLat),
                lng: Number(orchardLng),
                source: 'orchard'
            };
        } else {
            location = await this.getCurrentLocation();
        }

        this.renderLocationStatus(location);

        const weather = await this.fetchWeather(location.lat, location.lng);

        if (weather) {
            this.renderUI(weather);

            globalThis.MANGO_WEATHER = {
                ...weather,
                latitude: location.lat,
                longitude: location.lng,
                locationSource: location.source
            };

            return globalThis.MANGO_WEATHER;
        }

        this.renderError();
        return null;
    },

    startAutoRefresh(orchardLat = null, orchardLng = null) {
        this.init(orchardLat, orchardLng);

        setInterval(() => {
            this.init(orchardLat, orchardLng);
        }, this.refreshInterval);
    }
};

globalThis.WEATHER = WEATHER;

document.addEventListener('DOMContentLoaded', () => {
    WEATHER.startAutoRefresh();
});
