from pydantic_settings import BaseSettings


class Settings(BaseSettings):

    notion_token: str = ""

    notion_parent_page: str = ""

    class Config:
        env_file = ".env"


settings = Settings()