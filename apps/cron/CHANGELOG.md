# Changelog

0.1.0 is not noted here

## [0.6.0] - 2025-12-12

- fix: currency `updatedAt` column not updated
- add notice for estimation

## [0.5.0] - 2025-12-11

- using usdt/thb to estimate currency exchange rate
- using tether gold to estimate gold price
- small improvement to logger to indicate if there were warnings or errors during the run
- bump deps

## [0.4.0] - 2025-12-07

- use yahoo for thai stocks because it is easier to do than set, so we can get rid of 2GB thicc playwright
- feat: price updater for thai mutal fund via SEC API
- feat: price updater for cryptocurrencies via Binance(.th) API

## [0.3.0] - 2025-12-07

- reduce sql values logging size by formatting as one item per line
- filter some stale prices
- feat: price updater for US stocks using `yahoo-finance2`

## [0.2.0] - 2025-12-06

- feat: implemented price update for thai stocks and calculateBalance function
- some refactor
