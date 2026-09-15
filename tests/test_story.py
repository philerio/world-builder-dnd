from worldbuilder.models.story import (
    StoryContent,
    StoryEntityLink,
    StoryText,
)


def test_story_content_supports_entity_links() -> None:
    story = StoryContent(
        nodes=[
            StoryText(
                text="The party discovered "
            ),
            StoryEntityLink(
                text="an ancient artifact",
                entity_id="test-artifact",
            ),
        ]
    )

    assert len(story.nodes) == 2
    assert story.nodes[0].text == "The party discovered "
    assert story.nodes[1].text == "an ancient artifact"
    assert story.nodes[1].entity_id == "test-artifact"