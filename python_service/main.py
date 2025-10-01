"""FastAPI bridge for routing kiosk chat through Gemini."""
from __future__ import annotations

import os
from typing import List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .little_terminal import LittleTerminal
from .state import SessionState, store


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = Field(default=None, alias="sessionId")


class ChatResponse(BaseModel):
    session_id: str = Field(alias="sessionId")
    lines: List[str]
    secret_revealed: bool = Field(alias="secretRevealed")

    class Config:
        populate_by_name = True


def build_app() -> FastAPI:
    api = FastAPI(title="Little Terminal LLM Bridge", version="0.1.0")

    api.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    little_terminal = LittleTerminal(
        model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite"),
    )

    @api.post("/llm/respond", response_model=ChatResponse)
    async def respond(payload: ChatRequest) -> ChatResponse:
        session: SessionState = store.get_or_create(payload.session_id)
        reply = await little_terminal.generate(user_message=payload.message, session=session)
        store.save(session)
        return ChatResponse(
            session_id=session.id,
            lines=reply.lines,
            secret_revealed=reply.secret_revealed,
        )

    @api.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return api


app = build_app()
