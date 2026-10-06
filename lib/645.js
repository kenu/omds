const axios = require('axios')

const ArrayUtils = {
  shuffle: function (array) {
    // Knuth suffle: https://stackoverflow.com/a/2450976
    let currentIndex = array.length,
      temporaryValue,
      randomIndex

    while (0 !== currentIndex) {
      randomIndex = Math.floor(Math.random() * currentIndex)
      currentIndex -= 1

      temporaryValue = array[currentIndex]
      array[currentIndex] = array[randomIndex]
      array[randomIndex] = temporaryValue
    }

    return array
  },
}

let latestLotto = null
let latestLottoFetchedAt = null
const LOTTO_CACHE_TTL = 60 * 60 * 1000 // 1시간

function getRandomList(max, count) {
  const list = []
  for (let i = 0; i < max; i++) {
    list.push(i + 1)
  }
  ArrayUtils.shuffle(list)
  return list.slice(0, count)
}

async function lottoHandler(req, res) {
  const lotto = getRandomList(45, 6)
    .sort((a, b) => a - b)
    .join(', ')

  const now = Date.now()
  const cacheExpired = !latestLottoFetchedAt || (now - latestLottoFetchedAt) > LOTTO_CACHE_TTL

  if (cacheExpired) {
    try {
      const response = await axios.get(
        'https://www.dhlottery.co.kr/lt645/selectPstLt645Info.do?_=' + now,
        {
          timeout: 3000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        }
      )
      if (response.data && response.data.data && response.data.data.list && response.data.data.list.length > 0) {
        latestLotto = response.data.data.list[0]
        latestLottoFetchedAt = now
      }
    } catch (error) {
      console.error('Failed to fetch latest lotto numbers:', error.message)
    }
  }

  res.render('645', { lotto, latestLotto })
}

module.exports = { lottoHandler }
