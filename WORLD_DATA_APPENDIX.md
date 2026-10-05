# Structured World Data Appendix

This appendix is generated from the structured world export available during handoff creation. The JSON source is preserved in `source/structured_world_export.json`.

## worlds

### Elligaesia (`elligaesia-world`)

**description:** A high fantasy world containing the continents of Elligaesia and Rendelle.


**version:** 1.0

**author:** Patrick

**continents:**
```json
[
  "elligaesia",
  "rendelle"
]
```

## continents

### Elligaesia (`elligaesia`)

**description:** A continent within the world of Elligaesia.


### Rendelle (`rendelle`)

**description:** A continent within the world of Elligaesia.


## kingdoms

## regions

## cities

### Reqrun (`reqrun`)

**description:** A town in Batik that was liberated after the Aboleth Crisis and later became the site of the White Rabbit Incident.


### Stratos (`stratos`)

**description:** A High Elf city that was believed to have been lost. Stratos is suspended in the sky and is ruled by Dorith, whose control is enforced through mechanized golems.


**details:** Stratos was originally a ground-based city ruled by High Elves. The city's ruling class remains High Elf, and Aerith is technically a High Elf. The city is currently suspended in the sky by ancient technology. The same system is connected to the mechanized golems that control the city.


**dm_notes:** Aerick used ancient Dwarmar technology to lift Stratos into the sky. The technology sustaining Stratos is slowly draining life from the surrounding land, causing the desert to gradually expand.
Dorith, Aerith's maternal uncle, currently rules Stratos and controls the city through the mechanized golems.
The eventual solution is to disable the mechanism powering the city. Doing so will cause the golems to lose power, free the people trapped under Dorith's control, stop the desert from expanding, and cause Stratos to descend back toward the ground.


## npcs

### Aerick (`aerick`)

**description:** A High Elf of Stratos and Aerith's father. Aerick was responsible for lifting Stratos into the sky using ancient Dwarmar technology.


**role:** Former Ruler of Stratos

**city:** stratos

**details:** Aerick used ancient Dwarmar technology to lift Stratos from the ground and trap the city in the sky. He and Aerith disappeared approximately 400 years ago, and Stratos was subsequently believed to have been lost.


**relationships:**
```json
[
  {
    "character": "elorith",
    "relationship": "spouse",
    "notes": null
  },
  {
    "character": "aerith",
    "relationship": "daughter",
    "notes": null
  }
]
```

### Alatar (`alatar`)

**description:** A human wizard and teacher in Reqrun who specializes in healing magic and carries the scars of an ancient conflict he cannot initially remember.


**role:** school-wizard

**city:** reqrun

**details:** Alatar is an old human wizard who appears younger than his age. He is reserved, pacifistic, and complacent, and he teaches healing magic at the School of Reqrun.
Alatar arrived in Reqrun years ago with no memory of his previous life. The people of the town welcomed him, and he eventually became a teacher.
Alatar is missing an arm. As his memories begin to return, he recalls an ancient conflict with a powerful sorcerer. He believes he once had a vendetta against that sorcerer.
The Necromancer erased Alatar's memories in order to make him a scapegoat for the Necromancer's actions. The Necromancer had also been missing an arm and removed Alatar's arm as part of the deception.
Alatar has researched the strange events surrounding Reqrun, including Aerith's history, the corruption affecting Harry, and the ancient sorcerer connected to the town's past.


**events:**
```json
[
  {
    "description": "Alatar arrived in Reqrun with no memory of his previous life and was welcomed by the townspeople.\n",
    "campaign": null,
    "location": "reqrun"
  },
  {
    "description": "Alatar became a teacher of healing magic at the School of Reqrun.\n",
    "campaign": null,
    "location": "reqrun"
  },
  {
    "description": "Alatar began researching the strange events surrounding Reqrun, including Aerith's history and the corruption affecting Harry.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  },
  {
    "description": "Alatar revealed that the ancient sorcerer had experimented on creatures and was connected to the events surrounding Reqrun.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  },
  {
    "description": "Alatar's forgotten history was revealed: the Necromancer had erased his memories and removed his arm in order to use him as a scapegoat.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  }
]
```

### Albert (`albert`)

**description:** A Storm Mule associated with green lightning who wanders the land protecting those in need.


**role:** storm-mule

**details:** Albert is a Storm Mule associated with green lightning. He does not maintain a permanent residence and instead wanders the land, protecting those in need. After the White Rabbit Incident, Albert became known as the Guardian of the Roads. This character will appear periodically in the story, providing assistance to the main characters during their journey.

**events:**
```json
[
  "Struck by lightning and was given powers.",
  "Ran away from his owner after a failed charisma check."
]
```

### Ann (`ann`)

**description:** A human farmer in Reqrun who is judgmental, untrusting, and convinced that she is better than those around her.


**role:** farmer

**city:** reqrun

**details:** Ann is a human farmer who lives on the north side of Reqrun, with the river to the west of her farm.
She is judgmental and untrusting, and can be difficult to deal with. Ann considers herself better than others in town.
During the disappearances, four of Ann's cattle went missing. She believes that Orivom stole them to use for beard oil.


**events:**
```json
[
  {
    "description": "Four of Ann's cattle went missing during the disappearances around Reqrun.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  },
  {
    "description": "Ann accused Orivom of stealing her cattle to use for beard oil.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  }
]
```

### Bane (`bane`)

**description:** An ancient god who interfered with mortals and was punished by the other gods. Rather than destroy him, the gods imprisoned Bane within the body of a mortal sorcerer, stripping away much of his memory.


**role:** God

**details:** Bane's influence continues to affect the world long after his banishment. His connection to the Power Sources and the ancient Dwarmar civilization remains a major mystery.

### William "Bill" (`bill`)

**description:** A farmer who recovered his family's greatsword and now protects Reqrun.


**role:** farmer

**city:** reqrun

**details:** William "Bill" is a farmer who recovered his family's greatsword and now protects Reqrun.

### Dobby (`dobby`)

**description:** An elven farmer who owns the largest farm southwest of Reqrun.


**role:** farmer

**city:** reqrun

**details:** Dobby is an elf who operates the largest farm southwest of Reqrun. His farm produces grains and raises pigs, cows, and chickens.
During the investigation into the missing animals, Dobby is away in Crossdale. Fredrick is caring for the farm in his absence.
None of Dobby's animals are reported missing during the events surrounding Reqrun.


**events:**
```json
[
  {
    "description": "Dobby left Reqrun for Crossdale, leaving Fredrick to care for his farm.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  },
  {
    "description": "The party investigated Dobby's farm and found that none of his animals were missing.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  }
]
```

### Dorith (`dorith`)

**description:** A High Elf and the current ruler of Stratos. Dorith is Aerith's uncle and maintains control of the city through its mechanized golems.


**role:** Ruler of Stratos

**city:** stratos

**details:** Dorith is a member of Stratos's High Elf ruling class and currently controls the city through the mechanized golems.


**relationships:**
```json
[
  {
    "character": "elorith",
    "relationship": "sister",
    "notes": null
  },
  {
    "character": "aerith",
    "relationship": "maternal niece",
    "notes": null
  }
]
```

### Dronath (`dronath`)

**description:** An ancient Aboleth awakened beneath the northern lake after being trapped underground for centuries.


**role:** aboleth

**details:** Dronath is the son of the ancient Aboleth that once ruled the lake and surrounding city. During the ancient conflict between his mother, the wizard, and the sorcerer, Dronath became trapped underground.
Dronath was eventually freed when storms and construction connected to Reqrun disturbed the area. After awakening, he began feeding on livestock to regain his strength and discovered that the sorcerer responsible for the ancient conflict was still alive.
Dronath seeks revenge against the sorcerer. He wants the sorcerer dead and initially uses the crisis surrounding Reqrun to force the party into confronting him.
Dronath remembers that the ancient wizard was consumed by his mother and that the wizard's memories became part of her. The sorcerer later damaged her memory during their conflict.


**events:**
```json
[
  {
    "description": "Dronath was awakened after storms and construction connected to Reqrun disturbed the area surrounding the northern lake.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  },
  {
    "description": "Dronath began feeding on livestock to restore his strength.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  },
  {
    "description": "Dronath discovered that the ancient sorcerer was still alive.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  },
  {
    "description": "Dronath revealed the ancient history connecting his mother, the wizard, and the sorcerer.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  },
  {
    "description": "Dronath demanded that the sorcerer be brought to him and offered to leave Reqrun alone if the party helped accomplish it.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  },
  {
    "description": "Dronath confronted the sorcerer and sought his death.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  }
]
```

### Elorith (`elorith`)

**description:** A High Elf of Stratos and Aerith's mother. She was transformed into one of the mechanized golems that now serve Dorith.


**role:** Former member of the High Elf ruling class

**city:** stratos

**details:** Aerith's mother was a member of the High Elf ruling class of Stratos before being transformed into a mechanized golem.
Her identity is hidden behind her transformed state, leaving her family and the people of Stratos unaware of her true condition.
Elorith is the sister of Dorith and the mother of Aerith. She was among the people transformed into a mechanized golem during Dorith's control of Stratos.


**events:**
```json
[
  "stratos-revealed"
]
```

**relationships:**
```json
[
  {
    "character": "aerick",
    "relationship": "spouse",
    "notes": null
  },
  {
    "character": "aerith",
    "relationship": "daughter",
    "notes": null
  },
  {
    "character": "dorith",
    "relationship": "sister",
    "notes": null
  }
]
```

### Emmyth Carfir (`emmyth-carfir`)

**description:** An elven teacher and wizard in Reqrun who teaches healing magic and knows that the town's history may not be what it seems.


**role:** teacher/wizard

**city:** reqrun

**details:** Emmyth Carfir is an elf who runs a school of magic in Reqrun and teaches healing. Some people in town blame the wizard associated with Reqrun's history for past events.
Emmyth believes the great wizard was not who people believed him to be. He directs the party toward the library to learn more about Reqrun's history and the ancient events surrounding the town.


**events:**
```json
[
  {
    "description": "Emmyth spoke with the party about the disappearances and suggested that the history of the great wizard was not what people believed.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  },
  {
    "description": "Emmyth directed the party to the library to investigate Reqrun's history.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  }
]
```

### Faela Logleragle (`faela-logleragle`)

**description:** A woman who was placed under the sorcerer's magical influence during the events surrounding Reqrun.


**role:** unknown

**details:** Faela Logleragle was under the sorcerer's mind control and was forced to act against her will. Those subjected to the sorcerer's control displayed a faint green glow in their eyes.
While under the sorcerer's influence, Faela attacked Rowan. Rowan killed Faela while defending herself.


**events:**
```json
[
  {
    "description": "Faela Logleragle was placed under the sorcerer's mind control.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  },
  {
    "description": "While under the sorcerer's control, Faela attacked Rowan.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  },
  {
    "description": "Rowan killed Faela while defending herself.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  }
]
```

### Frank (`frank`)

**description:** The blacksmith of Reqrun, a reserved and honest craftsman who was secretly forced to serve the sorcerer through mind control.


**role:** blacksmith

**city:** reqrun

**details:** Frank is a reserved, honest, and monotone blacksmith who has worked in Reqrun for years. He is well respected by the townspeople and produces equipment for local farmers as well as supplies for the town barracks.
Frank regularly traveled to the northern lake to fish and spend time alone. During these trips he heard strange noises coming from across the lake.
During the events surrounding the disappearances, Frank was placed under the sorcerer's magical influence. He was forced to assist with the sorcerer's plans against his will.
Those under the sorcerer's control could be recognized by a faint green glow in their eyes.
A farmer saw Frank sneaking around on the evening that Jackson was supposedly taken. Frank claimed that he had been fishing at the northern lake.


**events:**
```json
[
  {
    "description": "Frank continued working as the blacksmith of Reqrun while secretly being subjected to the sorcerer's mind control.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  },
  {
    "description": "Frank was seen sneaking around on the evening that Jackson was supposedly taken and claimed that he had been fishing at the northern lake.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  },
  {
    "description": "Frank was forced by the sorcerer's mind control to assist with the events surrounding the disappearances.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  },
  {
    "description": "Frank's connection to the sorcerer's mind control was revealed.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  }
]
```

### Fredrick (`fredrick`)

**description:** A human farmer in Reqrun who is friendly but cautious and shy, and who became entangled in the Aboleth's influence.


**role:** farmer

**city:** reqrun

**details:** Fredrick is a human farmer who lives south and east of the river in Reqrun. He grows grain and raises pigs.
Fredrick is friendly, but cautious and shy. When questioned about the missing animals, he initially claims that only one of his pigs is missing. A closer examination reveals that many more animals, including dogs, have disappeared.
Fredrick was under the influence of the Aboleth during the events surrounding the disappearances. When pressed, the Aboleth's influence could cause him to become violent.


**events:**
```json
[
  {
    "description": "Fredrick reported that one of his pigs was missing during the investigation into the disappearances.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  },
  {
    "description": "The party discovered that many more animals, including dogs, had disappeared from Fredrick's farm.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  },
  {
    "description": "Fredrick was revealed to be under the influence of the Aboleth.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  }
]
```

### Narle (`narle`)

**description:** A witness to the confrontation between Rowan and Faela during the events surrounding Reqrun.


**role:** unknown

**details:** Narle witnessed Rowan escaping with Moose after Rowan killed Faela Logleragle.
Rowan's explanation and Charisma convinced Narle that Rowan was not responsible for what had happened to Faela.


**events:**
```json
[
  {
    "description": "Narle witnessed Rowan escaping with Moose after the confrontation with Faela Logleragle.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  },
  {
    "description": "Rowan convinced Narle that she was not responsible for Faela's death.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  }
]
```

### Nedda (`nedda`)

**description:** The halfling innkeeper of The Mandolin in Reqrun, who runs her family's inn with a stern attitude and little tolerance for nonsense.


**role:** innkeeper

**city:** reqrun

**details:** Nedda is the owner of The Mandolin and inherited the inn from her father, who died during an Orc raid many years ago. Her family has operated the inn for generations.
Nedda is stern, judgmental, and welcoming, but does not tolerate nonsense. She is distrustful of Orcs, Elves, and Wizards.
Nedda employs two dwarf barbarians at the inn. If an argument becomes serious, she can whistle for them to arm themselves.
Nedda is the only halfling living in Reqrun. Her family originally came from Haffinton, though she has not returned there since she was a little girl.
Nedda knows the story of the Mad Halfling and the mysterious ring. Her family used the story to frighten her into eating her vegetables when she was young.
Nedda's inn suffered damage during a storm, including a tree falling onto the building. She is saving money to repair the leaky roof.


**events:**
```json
[
  {
    "description": "Nedda's inn served as a gathering place for the party while they investigated the disappearances in Reqrun.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  },
  {
    "description": "One of Nedda's dwarf employees came under the sorcerer's mind control and attacked the party.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  },
  {
    "description": "Nedda provided the party with information about the farmers and the disappearances occurring around Reqrun.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  }
]
```

### Orivom (`orivom`)

**description:** A friendly dwarf farmer in Reqrun who loves fishing, good company, and cooking.


**role:** farmer

**city:** reqrun

**details:** Orivom is a friendly dwarf farmer who lives on the south side of Reqrun near the river. He enjoys fishing and spending time with other people, and is known as a great cook.
Orivom is somewhat superstitious and is knowledgeable about the dangers surrounding the area. He warns travelers about the mountain lake north of Reqrun.
Orivom has helped defend the town from Orcs in the past.
During the disappearances, four of Orivom's prize goats went missing.


**events:**
```json
[
  {
    "description": "Four of Orivom's prize goats went missing during the events surrounding the disappearances.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  },
  {
    "description": "Orivom warned the party about the mountain lake and the dangers surrounding it.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  },
  {
    "description": "Orivom helped defend Reqrun from Orcs.\n",
    "campaign": null,
    "location": "reqrun"
  }
]
```

### Pattrice (`pattrice`)

**description:** The respected human governor of Reqrun who secretly possesses a much darker identity.


**role:** governor

**city:** reqrun

**details:** Pattrice has governed Reqrun for many years and is well respected by its citizens. He helped lead the town into a period of prosperity, with strong trade, food, and housing for its people.
Beneath this public identity, Pattrice is the sorcerer and necromancer responsible for manipulating events in Reqrun. He possesses the ability to transfer his consciousness into other bodies, allowing him to survive beyond a normal lifetime. He sought to use the ancient altar beneath the town to restore his strength and continue his existence.
Pattrice fabricated the story of his missing son in order to gain the party's trust and draw them into the events surrounding the Aboleth.


**events:**
```json
[
  {
    "description": "Pattrice employed the adventurers to investigate the disappearances occurring around Reqrun.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  },
  {
    "description": "Pattrice intervened when the party was detained by the town guards, appearing to help them while secretly manipulating the situation.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  },
  {
    "description": "Pattrice's identity as the sorcerer behind the events in Reqrun was revealed.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  },
  {
    "description": "Pattrice confronted Dronath and attempted to force the Aboleth to submit to his will.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  }
]
```

### Shana (`shana`)

**description:** The librarian of Reqrun who knows the town's history and the strange events surrounding the disappearances.


**role:** librarian

**city:** reqrun

**details:** Shana is the librarian of Reqrun. She knows about the recent disappearances and has knowledge of the town's history, including the ancient conflict involving the wizard, the necromancer, and the Aboleth.


**events:**
```json
[
  {
    "description": "Shana provided the party with information about the disappearances and the history of Reqrun.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  },
  {
    "description": "Shana directed the party toward information concerning the ancient wizard and the Aboleth.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  }
]
```

## player_characters

### Aerith (`aerith`)

**description:** A wood elf mercenary from West Wood who has always suspected that she does not truly belong to the family that raised her.


**role:** player-character

**city:** stratos

**details:** Aerith was adopted by the rulers of West Wood and grew up in the great elven city. She never felt that she belonged there and has only fragmented memories of her early childhood, including bright flashes and a faint blue glow.
Aerith is unusually tall for a wood elf and was naturally gifted with a bow from a young age. Her adoptive parents eventually gave her a bow bearing ancient lettering, telling her that it belonged to her true family.
After leaving the forest as soon as she was old enough, Aerith became a mercenary.
Aerith is technically a High Elf and is connected to the High Elf ruling class of Stratos.
Stratos was believed to have been lost before Aerith's connection to the city was revealed.


**events:**
```json
[
  "stratos-revealed",
  {
    "description": "Aerith was adopted by the rulers of West Wood.\n",
    "campaign": null,
    "location": null
  },
  {
    "description": "Aerith left the forest and became a mercenary.\n",
    "campaign": null,
    "location": null
  },
  {
    "description": "Aerith joined the mercenary group that would eventually investigate the events in Reqrun.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  }
]
```

**relationships:**
```json
[
  {
    "character": "aerick",
    "relationship": "father",
    "notes": null
  },
  {
    "character": "elorith",
    "relationship": "mother",
    "notes": null
  },
  {
    "character": "dorith",
    "relationship": "maternal uncle",
    "notes": null
  }
]
```

### Harry (`harry`)

**description:** A halfling scholar and aspiring fighter whose mysterious ring has gradually corrupted him while granting him strange abilities.


**role:** player-character

**details:** Harry is a halfling from Haffinton and a scholar of animal studies. He discovered a mysterious ring after seeing a flash from the sky. Over the years, the ring corrupted him and he became known as the "Mad Halfling," although Harry believes that he is completely sane.
Harry originally wanted to become a fighter and spent time boxing in Larton, where he lost repeatedly. He eventually convinced a wizard to enchant a pair of gloves for him. The gloves grant him great strength but cannot be removed.
The mysterious ring fits over the gloves. After obtaining both, Harry began winning his fights and was eventually recruited by the mercenary leader.


**events:**
```json
[
  {
    "description": "Harry discovered the mysterious ring after seeing a flash from the sky.\n",
    "campaign": null,
    "location": null
  },
  {
    "description": "The ring gradually corrupted Harry, leading to his reputation as the \"Mad Halfling.\"\n",
    "campaign": null,
    "location": null
  },
  {
    "description": "Harry attempted to become a fighter and repeatedly lost boxing matches in Larton.\n",
    "campaign": null,
    "location": "larton"
  },
  {
    "description": "Harry convinced a wizard to enchant his gloves, giving him great strength. The gloves cannot be removed.\n",
    "campaign": null,
    "location": "larton"
  },
  {
    "description": "Harry began winning fights after combining the enchanted gloves with the mysterious ring.\n",
    "campaign": null,
    "location": "larton"
  },
  {
    "description": "Harry was recruited by the mercenary leader.\n",
    "campaign": null,
    "location": null
  },
  {
    "description": "Harry's ring became an important factor in encounters with the sorcerer and creatures influenced by him.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  }
]
```

### Rowan (`rowan`)

**description:** A human swordswoman and mercenary driven by the loss of her father and her desire for revenge against the Orcs responsible.


**role:** player-character

**details:** Rowan was raised in Baldon by her father, a blacksmith who taught her how to fight with a sword.
While exploring one day, Rowan discovered Moose trapped in a cage and freed him. Through their connection, Rowan gained the ability to communicate with animals.
While returning from a supply trip, Rowan and her family were ambushed by Orcs. Her father was killed by a stab in the back, and Rowan killed the remaining Orcs. She swore revenge against the Orcs responsible and eventually joined a mercenary group, where she met Aerith.


**events:**
```json
[
  {
    "description": "Rowan's father taught her how to fight with a sword.\n",
    "campaign": null,
    "location": "bald-on"
  },
  {
    "description": "Rowan freed Moose from a cage and formed a bond with him, gaining the ability to communicate with animals.\n",
    "campaign": null,
    "location": null
  },
  {
    "description": "Rowan's family was ambushed by Orcs while returning from a supply trip. Her father was killed, and Rowan killed the remaining Orcs.\n",
    "campaign": null,
    "location": null
  },
  {
    "description": "Rowan swore revenge against the Orcs responsible for her father's death and joined a mercenary group.\n",
    "campaign": null,
    "location": null
  },
  {
    "description": "Rowan met Aerith after joining the mercenaries.\n",
    "campaign": null,
    "location": null
  },
  {
    "description": "Faela Logleragle, while under the sorcerer's mind control, attacked Rowan. Rowan killed Faela while defending herself.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  },
  {
    "description": "Rowan escaped with Moose after the confrontation with Faela. Narle witnessed Rowan leaving with Moose and was convinced that Rowan was not responsible for Faela's death.\n",
    "campaign": "the-unforgiven",
    "location": "reqrun"
  }
]
```

## campaigns

### The Unforgiven (`the-unforgiven`)

**description:** The campaign centered on the strange disappearances in Reqrun, the awakening of an ancient Aboleth, and the discovery of the sorcerer's true identity.


**overview:** Animals begin disappearing from Reqrun at night, followed by the disappearance of the governor's supposed son. The party investigates the town, follows clues toward the northern lake, and becomes entangled in an ancient conflict involving an Aboleth and a mysterious sorcerer.


**status:** completed

**locations:**
```json
[
  "reqrun"
]
```

**npcs:**
```json
[
  "pattrice",
  "nedda",
  "frank",
  "shana",
  "emmyth-carfir",
  "dronath"
]
```

**outcome:** The party uncovered the truth behind the disappearances and confronted the sorcerer and the Aboleth.


**consequences:** Reqrun was liberated from the sorcerer's influence. The events surrounding the Aboleth and the sorcerer's past revealed deeper forces affecting the world.


### White Rabbit Incident (`white-rabbit-incident`)

**description:** A strange magical incident during a festival in Reqrun resulted in a superpowered White Rabbit and an army of empowered rabbits.


**overview:** During a festival in Reqrun, a magical fountain is struck by emerald lightning. The resulting magic grants extraordinary abilities to a White Rabbit, who creates an army of empowered rabbits. The party ultimately defeats the White Rabbit using the Holy Hand Grenade.


**status:** completed

**locations:**
```json
[
  "reqrun"
]
```

**npcs:**
```json
[
  "bill",
  "albert"
]
```

**outcome:** The White Rabbit was defeated using the Holy Hand Grenade.


**consequences:** Bill became known as the Defender of Reqrun, while Albert became known as the Guardian of the Roads. The Holy Hand Grenade was returned to the church in Reqrun.


## world_events

### Collapse of the Batik Trade Route (`batik-trade-route-collapse`)

**description:** The ancient trade road through Batik has been overtaken by monsters after the protective magic surrounding the road began to fail.


**type:** consequence

**status:** ongoing

**locations:**
```json
[
  "batik"
]
```

**campaigns:**
```json
[
  "the-unforgiven"
]
```

**caused_by:**
```json
[
  "the-unforgiven"
]
```

**true_causes:**
```json
[
  "pattrice"
]
```

**hidden_connections:**
```json
[
  "bane",
  "dwarmar"
]
```

**dm_notes:** The protective magic surrounding the road was drained by Pattrice during The Unforgiven. He used the stolen magic to power his enchantment and sustain himself.
The collapse of the trade route is one of the larger consequences of The Unforgiven and contributes to the political instability affecting Elligaesia.
The deeper connection is to Bane and the remnants of Dwarmar technology. Bane's growing influence is contributing to the reactivation and increasing importance of ancient Dwarmar machines and power sources.


**consequences:**
```json
[
  "Trade along the southern route has been disrupted.",
  "Monsters now threaten travelers using the road.",
  "The disruption contributes to growing trade tensions across Elligaesia."
]
```

**potential_campaign:** True

### Elligaesia Trade Dispute (`elligaesia-trade-dispute`)

**description:** The political leaders of Elligaesia are unable to agree on how to address the growing trade problems affecting the land.


**type:** political

**status:** ongoing

**caused_by:**
```json
[
  "batik-trade-route-collapse"
]
```

**hidden_connections:**
```json
[
  "bane",
  "dwarmar"
]
```

**dm_notes:** The immediate cause of the trade dispute is the collapse of the Batik trade route. The deeper consequences of the crisis may eventually connect to Bane's growing influence and the reemergence of ancient Dwarmar technology.


**consequences:**
```json
[
  "Trade tensions have increased between the country-states.",
  "Regions are having to compensate for the loss of goods from Batik."
]
```

**potential_campaign:** True

### Serenno Civil War Event (`serenno-civil-war-event`)

**description:** Serenno has descended into civil war following the assassination of its ruling family.


**type:** conflict

**status:** ongoing

**locations:**
```json
[
  "serenno"
]
```

**dm_notes:** The assassination of Serenno's ruling family is the immediate cause of the civil war. The deeper circumstances surrounding the assassination have not yet been established.


**potential_campaign:** True

### Stratos Golem Conversion (`stratos-golem-conversion`)

**description:** The people of Stratos are transformed into mechanized golems under Dorith's control.


**type:** crisis

**status:** ongoing

**locations:**
```json
[
  "stratos"
]
```

**campaigns:**
```json
[
  "the-unforgiven"
]
```

**caused_by:**
```json
[
  "dorith",
  "stratos-dwarmar-mechanism"
]
```

**true_causes:**
```json
[
  "dorith"
]
```

**hidden_connections:**
```json
[
  "stratos-dwarmar-mechanism",
  "dwarmar",
  "bane"
]
```

**dm_notes:** The mechanized golems are powered by the same ancient Dwarmar technology that keeps Stratos suspended in the sky.
The golems are not simply constructs. They contain people who have been imprisoned or transformed into mechanized bodies.
Elorith, Aerith's mother, is one of these golems.
The deeper relationship between the golems, the technology keeping Stratos airborne, and the draining of life from the surrounding land should be revealed during the Stratos storyline.


**consequences:**
```json
[
  "Many people of Stratos are imprisoned within mechanized bodies.",
  "Dorith gains control over the city through the golems.",
  "Elorith is among those transformed into a mechanized golem.",
  "The true nature of the golems is hidden from the outside world."
]
```

**potential_campaign:** False

### Teth-Umbara Island Conflict Event (`teth-umbara-island-conflict-event`)

**description:** Teth and Umbara are engaged in a conflict over a mysterious island that recently appeared in the ocean.


**type:** conflict

**status:** ongoing

**locations:**
```json
[
  "teth",
  "umbara"
]
```

**dm_notes:** The true origin of the island and the reason it appeared are currently unknown.


**potential_campaign:** True

### Zeffo Undead Sightings (`zeffo-undead-sightings`)

**description:** Rumors have spread of undead appearing in the woods of Zeffo.


**type:** supernatural

**status:** rumored

**locations:**
```json
[
  "zeffo"
]
```

**dm_notes:** The reports of undead are currently only rumors. The actual cause and nature of the undead activity have not yet been established.


**potential_campaign:** True

## timeline_events

### Bane Is Banished (`bane-banished`)

**description:** Bane, a powerful sorcerer, interferes with mortals and is banished from the world.


**era:** Ancient Era

**characters:**
```json
[
  "bane"
]
```

**consequences:**
```json
[
  "Bane is separated from the mortal world.",
  "Bane's influence continues to affect the world long after his banishment."
]
```

**dm_notes:** Bane's relationship with the Dwarmar and the Power Sources remains an important unresolved part of ancient history. The full circumstances surrounding his banishment have not yet been established.

### Bane Is Banished (`bane-banishment`)

**description:** Bane, a powerful god, interferes with mortals and is punished by the other gods. Rather than destroy him, the gods imprison him within the body of a sorcerer, stripping away much of his memory of his former existence.


**era:** Ancient Era

**characters:**
```json
[
  "bane"
]
```

**consequences:**
```json
[
  "Bane is separated from his divine existence.",
  "Bane becomes trapped within a mortal sorcerer's body.",
  "Much of Bane's memory of his former existence is lost.",
  "Bane must regain power and influence through the mortal world."
]
```

**dm_notes:** Bane was originally a god. His interference with mortals became severe enough that the other gods determined he had to be contained.
They could not simply destroy him, so they imprisoned his essence within the body of a sorcerer. This was the only method they had to contain him.
Bane initially has little memory of who he was before the imprisonment. His connection to the Dwarmar and the Power Sources may be part of how he gradually rediscovers his identity and begins rebuilding his influence.
The corruption caused by the Power Sources may be intentional. Rather than conquering the realm directly, Bane can use corrupted sources and their users to spread his influence throughout the world.

### Creation of the Power Sources (`creation-of-the-power-sources`)

**description:** The Dwarmar come into possession of the Power Sources, powerful magical artifacts that become central to their civilization. Ancient knowledge hints that Bane was involved in their origin or acquisition.


**era:** Ancient Era

**characters:**
```json
[
  "bane"
]
```

**consequences:**
```json
[
  "The Power Sources become central to Dwarmar civilization.",
  "Those who use the Power Sources are gradually corrupted."
]
```

**dm_notes:** The exact origin of the Power Sources remains unclear, but there are hints that Bane was responsible for introducing or providing them to the Dwarmar.
The Power Sources slowly corrupt those who use them. This corruption may have been part of Bane's larger plan: rather than simply controlling individuals directly, the Power Sources allow his influence to spread through those who depend upon their power.
The true relationship between Bane, the Dwarmar, and the Power Sources should remain partially hidden until revealed through the campaign.

### Dronath Is Awakened (`dronath-awakened`)

**description:** Construction of Reqrun's new capitol disturbs the ancient chamber beneath the town and awakens Dronath, an Aboleth that has been trapped beneath Reqrun for centuries.


**era:** Modern Era

**locations:**
```json
[
  "reqrun"
]
```

**characters:**
```json
[
  "dronath"
]
```

**campaigns:**
```json
[
  "the-unforgiven"
]
```

**consequences:**
```json
[
  "Dronath begins feeding on livestock to regain his strength.",
  "The river becomes poisoned.",
  "Animals begin disappearing from Reqrun.",
  "Dronath begins searching for the sorcerer who previously imprisoned him."
]
```

**dm_notes:** Dronath was trapped beneath Reqrun for approximately 1000 years. Construction and explosions associated with the new capitol disturb his prison and allow him to become active again.
Dronath discovers that the sorcerer responsible for his imprisonment is still alive and living in Reqrun.
Dronath does not initially seek to destroy the town. His primary goals are to regain his strength and find the sorcerer.

### Fall of the Dwarmar (`fall-of-the-dwarmar`)

**description:** The Dwarmar civilization falls after the Power Sources and the forces surrounding them bring about its eventual destruction.


**era:** Ancient Era

**consequences:**
```json
[
  "The Dwarmar civilization falls.",
  "The Power Sources become remnants of a lost civilization.",
  "Ancient Dwarmar knowledge and technology become lost or forgotten."
]
```

**dm_notes:** The exact circumstances of the Dwarmar's fall have not yet been fully established.
The Power Sources and their connection to Bane are important to understanding the downfall of the Dwarmar. Their tendency to slowly corrupt those who use them may have contributed to the civilization's eventual destruction.
Ancient Dwarmar machines and technology may still exist and can become relevant to the modern world as they are rediscovered or reactivated.

### Reqrun Animal Disappearances (`reqrun-animal-disappearances`)

**description:** Animals begin disappearing from Reqrun at night, creating fear and uncertainty throughout the town.


**era:** Modern Era

**locations:**
```json
[
  "reqrun"
]
```

**campaigns:**
```json
[
  "the-unforgiven"
]
```

**consequences:**
```json
[
  "Livestock and other animals are lost from the town.",
  "The disappearances lead to an investigation into what is happening around Reqrun."
]
```

**dm_notes:** The disappearances are caused by Dronath, the Aboleth beneath Reqrun. His minions harvest livestock so that he can feed and regain his strength after being trapped for centuries.
The disappearances are the initial mystery that draws the Misfits into the events of The Unforgiven.

### Reqrun Crisis Resolved (`reqrun-crisis-resolved`)

**description:** The crisis in Reqrun comes to an end with the defeat of the Aboleth and the sorcerer responsible for the events surrounding the town.


**era:** Modern Era

**locations:**
```json
[
  "reqrun"
]
```

**characters:**
```json
[
  "pattrice",
  "dronath"
]
```

**campaigns:**
```json
[
  "the-unforgiven"
]
```

**consequences:**
```json
[
  "The Aboleth threat to Reqrun is ended.",
  "The sorcerer's control over the town comes to an end.",
  "The protective magic of the northern road has been severely depleted.",
  "The political and supernatural consequences of the crisis continue beyond Reqrun."
]
```

**dm_notes:** The exact circumstances of the final confrontation should be recorded here once established in the campaign's final events.
Pattrice had been draining the magic protecting the northern road in order to power his enchantment and sustain himself. The loss of this magic becomes one of the lasting consequences of the crisis.
The resolution of the crisis also leads into the events surrounding the altar and Stratos/Aerith.

### Rise of the Dwarmar (`rise-of-the-dwarmar`)

**description:** The Dwarmar rise to prominence in the ancient history of Elligaesia.


**era:** Ancient Era

### Separation of the Northern and Southern Kingdoms (`separation-of-northern-and-southern-kingdoms`)

**description:** The gods divide the world into northern and southern regions as punishment for the mortals who allowed Bane to spread his influence. The Mountain of Bane becomes the great geographic boundary between the two regions. The mountains are filled with monsters, making passage between the regions extremely dangerous.


**era:** Ancient Era

**locations:**
```json
[
  "mountain-of-bane"
]
```

**characters:**
```json
[
  "bane"
]
```

**consequences:**
```json
[
  "The northern and southern regions are separated.",
  "The Mountain of Bane becomes a major geographic boundary.",
  "Monsters inhabit the mountain range.",
  "Travel between the northern and southern regions becomes extremely difficult.",
  "Powerful wizards eventually create a pass through the mountains.",
  "The road through the pass is enchanted to protect travelers from the monsters."
]
```

**dm_notes:** The gods deliberately separated the world as punishment for the mortal civilizations that allowed Bane to spread his influence.
The Mountain of Bane is the great mountain range separating the northern and southern regions. The mountains are filled with monsters, making them effectively impassable.
Powerful wizards eventually cut a pass through the mountain range and created an enchanted road connecting the regions. The magic surrounding the road protected travelers from the monsters of the mountains.
The road eventually became an important trade route through Batik, including the route passing through Reqrun.
During The Unforgiven, Pattrice drains the protective magic from the road to power his enchantment and sustain himself. As that magic disappears, the monsters are no longer restricted by the road's protections and can roam freely across it.
The loss of the road's magic threatens to effectively close the only reliable passage through the Mountain of Bane.

### Serenno Civil War (`serenno-civil-war`)

**description:** Serenno descends into civil war following the assassination of its ruling family.


**era:** Modern Era

**locations:**
```json
[
  "serenno"
]
```

**consequences:**
```json
[
  "Serenno is divided by civil war.",
  "The political stability of Serenno is disrupted.",
  "Trade and cooperation within Elligaesia are further strained."
]
```

**dm_notes:** The assassination of Serenno's ruling family is the established immediate cause of the civil war.
The identity of those responsible and any deeper connection to Bane, the Dwarmar, or the Power Sources have not yet been established.

### The Sorcerer's Identity Is Revealed (`sorcerer-identity-revealed`)

**description:** The truth behind the governor of Reqrun is revealed when Dronath recognizes him as the sorcerer responsible for imprisoning him.


**era:** Modern Era

**locations:**
```json
[
  "reqrun"
]
```

**characters:**
```json
[
  "pattrice",
  "dronath"
]
```

**campaigns:**
```json
[
  "the-unforgiven"
]
```

**consequences:**
```json
[
  "Pattrice's true nature is exposed.",
  "The conflict between Pattrice and Dronath comes into the open.",
  "The Misfits become directly involved in the confrontation between them."
]
```

**dm_notes:** Pattrice is the sorcerer who previously fought Dronath and imprisoned him. He had taken control of the town while concealing his true identity.
Pattrice's identity is revealed when Dronath addresses him as the sorcerer.
Pattrice attempts to turn the town's guards against the Misfits by claiming that they are working for Dronath.
The deeper truth about Pattrice's multiple lives, his ability to transfer his consciousness between bodies, and his connection to Bane should remain separate from the public-facing history until those revelations are appropriate.

### Stratos Returns (`stratos-returns`)

**description:** The mechanism sustaining Stratos in the sky is disabled, causing the city's mechanized golems to lose power and Stratos to descend back toward the ground.


**era:** Modern Era

**locations:**
```json
[
  "stratos"
]
```

**characters:**
```json
[
  "aerith",
  "dorith"
]
```

**campaigns:**
```json
[
  "the-unforgiven"
]
```

**consequences:**
```json
[
  "The mechanized golems lose their source of power.",
  "The people of Stratos are freed from the golems' control.",
  "The technology stops draining life from the surrounding land.",
  "The expansion of the desert stops.",
  "Stratos descends back toward the ground.",
  "The lost city of Stratos is restored to the wider world."
]
```

**dm_notes:** The mechanism keeping Stratos airborne and powering the golems is part of the same Dwarmar technological system.
Disabling the mechanism is intended to end Dorith's control over the city.
The mechanism's destruction also ends the process that has been draining life from the surrounding land and causing the desert to expand.
Stratos was believed to have been lost before its existence was rediscovered.
The exact circumstances of the mechanism's destruction and the final confrontation with Dorith should be established when the campaign reaches this point.


### Stratos Revealed (`stratos-revealed`)

**description:** The party discovers that Stratos, a city believed to have been lost, still exists as a floating city in the sky.


**era:** Modern Era

**locations:**
```json
[
  "stratos"
]
```

**characters:**
```json
[
  "aerith",
  "dorith"
]
```

**campaigns:**
```json
[
  "the-unforgiven"
]
```

**consequences:**
```json
[
  "The existence of Stratos becomes known to the party.",
  "Aerith's connection to Stratos becomes central to the continuing story.",
  "The party encounters the mechanized golems controlling the city."
]
```

**dm_notes:** Stratos was originally a ground-based High Elf city.
Aerith is technically a High Elf and is connected to the ruling class of Stratos.
Aerith's father used ancient Dwarmar technology to lift the city into the sky. This is not initially known to the players.
The technology keeping Stratos airborne is also responsible for powering the mechanized golems.
The same technology is slowly draining life from the surrounding land, causing the desert to expand.
Dorith, Aerith's uncle, currently rules Stratos and controls the city through the golems.
The full nature of the technology and its eventual connection to the fate of Stratos should be revealed gradually.


### Teth and Umbara Contest the Mysterious Island (`teth-umbara-island-conflict`)

**description:** Teth and Umbara enter into conflict over a mysterious island that has appeared in the ocean.


**era:** Modern Era

**locations:**
```json
[
  "teth",
  "umbara"
]
```

**consequences:**
```json
[
  "Teth and Umbara are drawn into conflict.",
  "Relations between the two nations deteriorate.",
  "The mysterious island becomes a potential source of future conflict."
]
```

**dm_notes:** The origin of the island and the reason it appeared have not yet been established.

### Undead Appear in Zeffo (`zeffo-undead-appear`)

**description:** Reports emerge of undead appearing in the woods of Zeffo.


**era:** Modern Era

**locations:**
```json
[
  "zeffo"
]
```

**consequences:**
```json
[
  "Undead activity is reported in Zeffo.",
  "The reports create concern about the safety of the region."
]
```

**dm_notes:** The true cause of the undead activity has not yet been established.

## lores

### High Elf Naming Convention Lore (`high-elf-naming-convention-lore`)

**description:** High Elf children are traditionally given names formed from variations of their parents' names.


**details:** A child's name incorporates elements of both parents' names. In Aerith's family, the "Aer" portion comes from her father Aerick, while the "ith" portion comes from her mother Elorith.
The same maternal naming element appears in Dorith, who is Elorith's brother. This reflects a family naming tradition in which parts of names can be inherited through the maternal and paternal lines.


**dm_notes:** The naming convention can be used to identify family relationships or ancestry among High Elves. The exact rules governing which portions of a parent's name are inherited are not yet fully established.


### Stratos Dwarmar Mechanism Lore (`stratos-dwarmar-mechanism-lore`)

**description:** An ancient Dwarmar technological system responsible for keeping Stratos suspended in the sky and powering the mechanized golems that control the city.


**player_knowledge:** The party knows that ancient technology is responsible for keeping Stratos suspended in the sky and that the city's mechanized golems are connected to the same source of power.


**details:** The mechanism sustains Stratos in the sky while also providing power to the city's mechanized golems. The system requires a continual source of energy and is slowly draining life from the surrounding land. This has caused the desert around Stratos to gradually expand.


**dm_notes:** Aerick used ancient Dwarmar technology to lift Stratos into the sky. The mechanism keeping the city airborne and the mechanism powering the golems are part of the same system.
The technology is slowly draining the land of life to power itself, causing the desert to expand.
Disabling the mechanism is the intended solution to the Stratos conflict. When it is disabled, the golems will lose power, the people trapped under Dorith's control will be freed, the desert will stop expanding, and Stratos will descend back toward the ground.
The full capabilities and origin of the technology should be revealed gradually.


### Stratos Ruling Family Lore (`stratos-ruling-family-lore`)

**description:** The High Elf family at the center of Stratos's history and its connection to Aerith.


**details:** Aerick and Elorith are the parents of Aerith.
Elorith is the sister of Dorith, making Dorith Aerith's maternal uncle.
Aerick was responsible for lifting Stratos into the sky using ancient Dwarmar technology.
Dorith currently rules Stratos and controls the city through its mechanized golems.


**dm_notes:** The family relationships are important to the Stratos storyline. Elorith's transformation into a mechanized golem and Dorith's control of the city directly affect Aerith's personal connection to the conflict.
The full history and motivations of the family should be revealed through the campaign.


## artifacts

### Stratos Dwarmar Mechanism (`stratos-dwarmar-mechanism`)

**description:** An ancient Dwarmar mechanism responsible for keeping Stratos suspended in the sky and powering the mechanized golems.


**details:** The mechanism uses ancient Dwarmar technology. Its operation is connected to the suspension of Stratos and the power sustaining the mechanized golems. Disabling the mechanism is expected to cause Stratos to return to the ground and deprive the golems of their power.


**dm_notes:** The mechanism is part of the same ancient technology responsible for the growing desert and the mechanized golems.

## maps
