/* global $ch */

var COOKIES = 'weather-locations';
var COOKIES_LENGTH = 365 * 5;

var STATE = {
  WEATHER: 1,
  CONFIG: 2
};

var YAHOO = {
  PREFIX: 'http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20weather.forecast%20where%20woeid%20in%20(select%20woeid%20from%20geo.places(1)%20where%20text%3D%22',

  POSTFIX: '%22)%20and%20u%20=%20%27c%27&format=json&env=store%3A%2F%2Fdatatables.org&u=c'
};

var ICON = {
  SUNNY: './img/Sunny.png',
  CLOUD: './img/Cloudy.png',
  PART_CLOUD: './img/Mostly Cloudy.png',
  MIST: './img/Haze.png',
  HAZE: './img/Haze.png',
  FOGGY: './img/Haze.png',
  RAIN: './img/Drizzle.png',
  LIST_RAIN: './img/Slight Drizzle.png',
  SNOW: './img/Snow.png',
  NA: './img/na.png',

 PREFIX: '<img width="100px" height="100px" src="',
 POSTFIX: '" alt="weather icon">'
};


// Lock screen rotation first.
// var lockOrientation = screen.lockOrientation || screen.mozLockOrientation || screen.msLockOrientation;
// if (lockOrientation) {
//   lockOrientation(["portrait-primary", "portrait-secondary"]);
// }


$ch.use(['./chop-bundle'], function () {
  'use strict';

  var locs = $ch.store.cookie(COOKIES) ||
      'Manchester, UK & Beijing, China & Seattle, US';
  locs = locs.split('&');
  locs = locs.map(function (loc) {return loc.trim();});


  $ch.event.listen('show weathers', function () {
    initWeathers();
    initWeatherEntities();
  });

  function initWeathers() {
    var template = $ch.readFile('weather_template.html');

    $ch.scope('appScope', function ($scope, $event) {
      $scope.container.html(template);

      $event.listen('goConfig', function () {
        // check state first.
        var state = $ch.source('state');
        if (state === STATE.WEATHER) {
          $ch.source('state', STATE.CONFIG);
          var configTemplate = $ch.readFile('./details_template.html');
          $scope.container.html(configTemplate);
          initConfig();

        } else {
          $ch.source('state', STATE.WEATHER);
          locs = $ch.source('locations') || locs.join('\n');
          locs = locs.split('\n');
          locs = locs.map(function (loc) {return loc.trim();});

          // Update cookies.
         $ch.store.cookie(COOKIES, locs.join('&'), COOKIES_LENGTH);

          $scope.container.html(template);
          initWeatherEntities();
        }
      });
    });
  }

  function initWeatherEntities() {
    $ch.scope('weatherScope', function ($scope, $event) {
      var data = [];

      $scope.touch = {start: 0, end: 0};

      $scope.weatherItem.on('touchmove', function (event) {
        event.preventDefault();
      });

      $scope.weatherItem.on('touchstart', function (event) {
        var touch = event.touches[0];
        $scope.touch = {start: 0, end: 0};
        $scope.touch.start = touch.pageX;
      });

      $scope.weatherItem.on('touchmove', function (event) {
        var touch = event.touches[0];
        $scope.touch.end = touch.pageX;
        var x = $scope.touch;

        var offsetL = x.end - x.start;
        var offsetR = x.start - x.end;
        $ch.find('.weather-item', $scope.weatherItem.el)
          .css('left', offsetL + 'px')
          .css('right', offsetR + 'px');

        if (offsetL > 100) {
          $event.emit('goNext');
        }
        else if (offsetR > 100) {
          $event.emit('goPrevious');
        }
      });

      $event.listen('forecast', function () {
        var template = $ch.readFile('./weather_forecast_template.html');
        $scope.forecastContainer.html(template);
        initForecast(data[$ch.source('current index')], $scope.forecastContainer);
      });

      $scope.weatherItem.on('touchend', function() {
        $ch.find('.weather-item', $scope.weatherItem.el)
          .css('left', '0')
          .css('right', '0');
      });

      bindArrowKeys();


      $event.listen('retrieve weather', function () {
        locs.forEach(function (loc, index) {
          var url = YAHOO.PREFIX + loc + YAHOO.POSTFIX;
          $ch.http(url, {
            done: function (res) {
              if (res.status === 200 || res.status === 304) {
                var raw = JSON.parse(res.responseText);
                data[index].raw = raw;
                raw = raw.query;
                if (raw.count === 0) {
                  data[index].temp = '?';
                  data[index].icon = ICON.PREFIX + ICON.NA + ICON.POSTFIX;
                  data[index].text = '';
                } else {
                  raw = raw.results.channel.item.condition;
                  data[index].ready = true;
                  data[index].temp = raw.temp;
                  data[index].text = raw.text;
                  data[index].name = data[index].name.split(',')[0].trim();
                  data[index].icon = ICON.PREFIX + workoutIcon(raw.text) + ICON.POSTFIX;

                  data[index].text = data[index].text.toLowerCase().replace(/\ /g, '-');
                }

                // only render the current weather location.
                if (index === $scope.index) {
                  var html = $ch.template($scope.template, data[index]);
                  $scope.weatherItem.html(html);
                }
              }
            }
          });
        });
      });

      $event.listen('goPrevious', function () {
        $scope.index -= 1;
        if ($scope.index < 0) {
          $scope.index = data.length - 1;
        }

        $ch.source('current index', $scope.index);
        var html = $ch.template($scope.template, data[$scope.index]);
        $scope.weatherItem.html(html);
      });

      $event.listen('goNext', function () {
        $scope.index += 1;
        if ($scope.index > data.length - 1) {
          $scope.index = 0;
        }

        $ch.source('current index', $scope.index);
        var html = $ch.template($scope.template, data[$scope.index]);
        $scope.weatherItem.html(html);
      });

      // First, initialize `data`.
      for (var i = 0, l = locs.length; i !== l; ++i) {
        data.push({
          name: locs[i].toUpperCase().split(',')[0].trim(),
          ready: false,
          temp: 0,
          text: 'loading...',
          icon: ICON.PREFIX + './img/na.png' + ICON.POSTFIX
        });
      }

      // Add current geolocation to `locs`.
      // var current = $ch.http('//freegeoip.net/json/', {async: false}).responseText;
      // current = JSON.parse(current).city;
      // locs.unshift(current);
      // data.unshift({
      //   name: current.toUpperCase().trim(),
      //   ready: false,
      //   temp: 0,
      //   text: 'loading...',
      //   icon: ICON.PREFIX + './img/na.png' + ICON.POSTFIX
      // })
      // console.log(locs);

      // Now, load weather item template.
      $scope.index = $ch.source('current index');
      $scope.template = $ch.readFile('./weather_item_template.html');
      var html = $ch.template($scope.template, data[0]);
      $scope.weatherItem.html(html);

      // Time to load Yahoo weather data now.
      $event.emit('retrieve weather');

      // Set interval for retreiving weather every minute.
      window.setInterval(function () {
        $event.emit('retrieve weather');
      }, 6 * 1000 * 10);

    });
  }

  function workoutIcon(weather) {
    weather = weather.toUpperCase();
    switch (weather) {
      case 'SUNNY':
      case 'CLEAR':
      case 'FAIR':
      case 'MOSTLY SUNNY':
      return ICON.SUNNY;

      case 'CLOUDY':
      case 'MOSTLY CLOUDY':
      return ICON.CLOUD;

      case 'PARTLY CLOUDY':
      return ICON.PART_CLOUD;

      case 'MIST':
      return ICON.MIST;

      case 'HAZE':
      return ICON.HAZE;

      case 'FOG':
      return ICON.FOGGY;

      case 'RAIN':
      case 'SHOWERS':
      case 'DRIZZLE':
      return ICON.RAIN;

      case 'LIGHT RAIN':
      case 'LIGHT RAIN SHOWER':
      case 'LIGHT DRIZZLE':
      return ICON.LIST_RAIN;

      case 'THUNDER':
      return ICON.THUNDER;

      case 'WINDY':
      return ICON.WINDY;

      case 'UNKNOWN':
      return ICON.NA;
    }
  }

  function initForecast(data, host) {
    $ch.scope('forecastScope', function ($scope, $event) {
      var forecast = data.raw.query.results.channel.item.forecast;
      forecast = forecast.map(function (item) {
        item.icon = ICON.PREFIX + workoutIcon(item.text) + ICON.POSTFIX;
        return item;
      });
      $scope.list.inline(forecast);

      $event.listen('close', function() {
        host.html('');
      });


      // add swipe gesture for closing forecast.
      var element = $ch.find('[ch-scope="forecastScope"]', host.el);
      var y = {start: 0, end: 0};
      var top = 50;
      $scope.list.on('touchstart', function (evt) {
        y.start = evt.touches[0].pageY;
      });

      $scope.list.on('touchmove', function (evt) {
        y.end = evt.touches[0].pageY;

        var offset = y.start - y.end;
        element.css('top', 50 - offset + 'px');

        if (offset > 100) {
          $event.emit('close');
        }
      });

      $scope.list.on('touchend', function () {
        element.css('top', '50px');
      });
    });
  }

  function initConfig() {
    $ch.scope('configScope', function ($scope, $event) {
      $event.listen('load', function ($scope) {
        var locList = [];
        locs.forEach(function (loc, index) {
          locList.push({name:  loc, id: index});
        });
        $scope.list.inline(locList);
      });

      $event.listen('addLocation', function () {
        var city = $scope.input.get() || '';
        city = city.trim();
        if (city.match(/\w+/)) {
          var locsStr = $ch.store.cookie(COOKIES);
          locsStr += '&' + city;
          $ch.store.cookie(COOKIES, locsStr, COOKIES_LENGTH);

          locs = locsStr.split('&');
          $ch.source('locations', locs.join('\n'));
          $event.emit('load', $scope);
          $scope.input.set('');
        }
      });

      $event.listen('keyLocation', function (evt) {
        // Add only if Enter pressed.
        if (evt.keyCode === 13) {
          $event.emit('addLocation');
        }
      });

      $event.emit('load', $scope);


      $ch.event.listen('remove location', function (id) {
        var locsStr = $ch.store.cookie(COOKIES);
        var regex = new RegExp(id + '\\&?', 'g');
        locsStr = locsStr.replace(regex, '');

        if (locsStr[locsStr.length - 1] === '&') {
          locsStr = locsStr.substring(0, locsStr.length - 1);
        }
        $ch.store.cookie(COOKIES, locsStr, COOKIES_LENGTH);

        locs = locsStr.split('&');
        $ch.source('locations', locs.join('\n'));
        $event.emit('load', $scope);
      });


    });
  }

  function bindArrowKeys() {
    var weatherScope = $ch.scope('weatherScope');
    if (weatherScope) {
      $ch.find('body').on('keyup', function (evt) {
        if (evt.keyCode === 37) { // left arrow
          weatherScope._eventHandler.emit('goPrevious');
        }
        else if (evt.keyCode === 39) { // right arrow
          weatherScope._eventHandler.emit('goNext');
        }
      });
    }

  }

  $ch.source('current index', 0);
  $ch.source('state', STATE.WEATHER);
  $ch.event.emit('show weathers');
});

