document.addEventListener("DOMContentLoaded", function () {
  let map, placemark;
let cityCenters = {}; // Здесь будут храниться координаты городов после геокодирования

function initMap() {
    const citySelect = document.getElementById("city");
    const defaultCity = citySelect.value;

    // Собираем список всех городов из select
    const citiesToLoad = Array.from(citySelect.options).map(opt => opt.value);

    // Функция для геокодирования одного города
    function geocodeCity(cityName) {
        return ymaps.geocode(cityName).then(res => {
            const firstObject = res.geoObjects.get(0);
            if (firstObject) {
                const coords = firstObject.geometry.getCoordinates();
                cityCenters[cityName] = coords;
            } else {
                console.warn(`Не найдены координаты для города "${cityName}"`);
            }
        });
    }

    // Геокодируем все города параллельно
    Promise.all(citiesToLoad.map(geocodeCity)).then(() => {
        const defaultCityCenter = cityCenters[defaultCity];
        if (!defaultCityCenter) {
            console.error("Не удалось найти координаты для города по умолчанию:", defaultCity);
            alert("Невозможно загрузить карту: не найдены координаты для выбранного города.");
            return;
        }

        // Инициализация карты
        map = new ymaps.Map("map", {
            center: defaultCityCenter,
            zoom: 10,
            controls: []
        });

        // Добавляем элементы управления
        const searchControl = new ymaps.control.SearchControl({
            options: {
                noPlacemark: true,
                boundedBy: [
                    [defaultCityCenter[0] - 0.1, defaultCityCenter[1] - 0.1],
                    [defaultCityCenter[0] + 0.1, defaultCityCenter[1] + 0.1]
                ],
                placeholderContent: 'Поиск дома в выбранном городе'
            }
        });
        map.controls.add(searchControl);

        // === geolocationControl с обработкой locationchange ===
        const geolocationControl = new ymaps.control.GeolocationControl();
        map.controls.add(geolocationControl);

        geolocationControl.events.add('locationchange', function (e) {
            const position = e.get('position');
            if (position) {
                const coords = position.geometry.getCoordinates();
                map.setCenter(coords, 16);
                setPlacemarkAndAddress(coords);
            }
        });

        // Клик по карте
        map.events.add("click", function (e) {
            const coords = e.get("coords");
            setPlacemarkAndAddress(coords);
        });

        // Поиск дома через SearchControl
        searchControl.events.add("resultselect", function (e) {
            const index = e.get("index");
            searchControl.getResult(index).then(function (res) {
                const coords = res.geometry.getCoordinates();
                map.setCenter(coords, 16);
                setPlacemarkAndAddress(coords);
            });
        });

        // Смена города в выпадающем списке
        citySelect.addEventListener("change", function () {
            const selectedCity = this.value;
            const selectedCityCenter = cityCenters[selectedCity];
            if (selectedCityCenter) {
                map.setCenter(selectedCityCenter, 10);
                searchControl.options.set('boundedBy', [
                    [selectedCityCenter[0] - 0.1, selectedCityCenter[1] - 0.1],
                    [selectedCityCenter[0] + 0.1, selectedCityCenter[1] + 0.1]
                ]);
            } else {
                alert("Не найдены координаты для выбранного города.");
            }
        });

        // Кнопка "Мое местоположение"
        const geolocationButton = new ymaps.control.Button({
            data: {
                content: "Мое местоположение",
                title: "Определить текущее местоположение"
            },
            options: {
                layout: 'default#buttonLayoutWithIcon',
                iconStyle: {
                    imageHref: 'https://cdn-icons-png.flaticon.com/512/1163/1163661.png', 
                    imageSize: [24, 24],
                    imageOffset: [-12, -12]
                }
            }
        });

        geolocationButton.events.add('click', function () {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    function (position) {
                        const userCoords = [position.coords.latitude, position.coords.longitude];
                        map.setCenter(userCoords, 16);
                        setPlacemarkAndAddress(userCoords);
                    },
                    function (error) {
                        console.warn("Геолокация недоступна:", error.message);
                        alert("Не удалось определить местоположение.");
                    }
                );
            } else {
                alert("Геолокация не поддерживается вашим браузером.");
            }
        });

        map.controls.add(geolocationButton);

        // Автоматическое определение местоположения на мобильных устройствах
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function (position) {
                    const userCoords = [position.coords.latitude, position.coords.longitude];
                    map.setCenter(userCoords, 16);
                    setPlacemarkAndAddress(userCoords);
                },
                function (error) {
                    console.warn("Геолокация недоступна:", error.message);
                }
            );
        }
    });
}
