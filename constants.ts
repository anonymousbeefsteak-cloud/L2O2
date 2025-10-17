
import type { MenuItem } from './types';

export const CONFIG = {
    restaurant: {
        name: "台灣小吃店",
        phone: "02-1234-5678",
        address: "臺北市信義區松壽路123號",
        businessHours: "10:00 - 22:00"
    },
    endpointUrl: "https://script.google.com/macros/s/AKfycbzwH5AnXX2TjU2CRAC81yaDko47AHCR5TETX9yT6sNwjPvWH-JgbTY0jVI1HJ2cfbg/exec",
    liffId: "2008276630-bYNjwMx7",
    fallbackMenu: [
        { id: 1, name: "滷肉飯", price: 35, emoji: "🍜", category: "主食" },
        { id: 2, name: "雞肉飯", price: 40, emoji: "🍚", category: "主食" },
        { id: 3, name: "蚵仔煎", price: 65, emoji: "🦪", category: "小吃" },
        { id: 4, name: "大腸麵線", price: 50, emoji: "🍲", category: "湯品" },
        { id: 5, name: "珍珠奶茶", price: 45, emoji: "🥤", category: "飲料" },
        { id: 6, name: "鹽酥雞", price: 60, emoji: "🍗", category: "小吃" },
        { id: 7, name: "甜不辣", price: 40, emoji: "🐟", category: "小吃" },
        { id: 8, name: "蚵仔酥", price: 70, emoji: "🦪", category: "小吃" },
        { id: 9, name: "肉圓", price: 45, emoji: "🥟", category: "小吃" },
        { id: 10, name: "碗粿", price: 35, emoji: "🍮", category: "小吃" }
    ] as MenuItem[]
};
