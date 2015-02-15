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
  SUNNY: './img/sunny.png',
  CLOUD: './img/cloudy.png',
  PART_CLOUD: './img/part-cloudy.png',
  HAZE: './img/haze.png',
  FOGGY: './img/fog.png',
  RAIN: './img/rain.png',
  SNOW: './img/snow.png',
  NA: './img/na.png',

 PREFIX: '<img width="100px" height="100px" src="',
 POSTFIX: '" alt="weather icon">'
};

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
          var configTemplate = $ch.readFile('./config_template.html');
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

        if (x.start > x.end) {
          $event.emit('goNext');
        }
        else if (x.start < x.end) {
          $event.emit('goPrevious');
        }
      });


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
      return ICON.SUNNY;

      case 'CLOUDY':
      return ICON.CLOUD;

      case 'MOSTLY CLOUDY':
      case 'PARTLY CLOUDY':
      return ICON.PART_CLOUD;

      case 'HAZE':
      return ICON.HAZE;

      case 'FOG':
      return ICON.FOGGY;

      case 'RAINNY':
      return ICON.RAIN;

      case 'THUNDER':
      return ICON.THUNDER;

      case 'WINDY':
      return ICON.WINDY;

      case 'UNKNOWN':
      return ICON.NA;
    }
  }


  function initConfig() {
    $ch.scope('configScope', function ($scope) {
      $scope.location.val(locs.join('\n'));
    });
  }


  $ch.source('current index', 0);
  $ch.source('state', STATE.WEATHER);
  $ch.event.emit('show weathers');

});