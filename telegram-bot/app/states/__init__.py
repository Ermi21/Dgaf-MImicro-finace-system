"""No aiogram FSM states currently exist here on purpose.

The registration form (the one flow that would traditionally need a
multi-step conversation state machine) is implemented entirely inside
the User Mini App, not as a bot conversation - per spec section 4,
Telegram handlers stay thin and never hold business logic or multi-step
form state. If a future feature needs a genuine bot-side conversation
(e.g. a text-based fallback flow), its FSM states go here.
"""
