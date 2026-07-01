// src/components/PokemonSprite.tsx
import { useState } from "react";

interface PokemonSpriteProps {
    displayName: string;
    className?: string; // Allows parent components to pass custom sizing/styling
}

export default function PokemonSprite({ displayName, className }: PokemonSpriteProps) {
    const [imgIndex, setImgIndex] = useState(0);

    const getShowdownName = (rawName: string) => {
        let cleanName = rawName.toLowerCase().trim();

        if (cleanName.includes(" male")) cleanName = cleanName.replace(" male", "");
        if (cleanName.includes(" female")) cleanName = cleanName.replace(" female", "-f");

        const showdownExceptions: Record<string, string> = {
            "basculegion male": "basculegion",
            "basculegion female": "basculegion-f",
            "furfrou natural form": "furfrou",
            "alolan ninetales": "ninetales-alola",
            "alolan raichu": "raichu-alola",
            "florges red flower": "florges",
            "galarian slowbro": "slowbro-galar",
            "galarian slowking": "slowking-galar",
            "galarian stunfisk": "stunfisk-galar",
            "rotom wash": "rotom-wash",
            "rotom heat": "rotom-heat",
            "rotom fan": "rotom-fan",
            "rotom mow": "rotom-mow",
            "rotom frost": "rotom-frost",
            "gourgeist small variety": "gourgeist-small",
            "gourgeist large variety": "gourgeist-large",
            "gourgeist jumbo variety": "gourgeist-super",
            "hisuian arcanine": "arcanine-hisui",
            "hisuian avalugg": "avalugg-hisui",
            "hisuian decidueye": "decidueye-hisui",
            "hisuian goodra": "goodra-hisui",
            "hisuian samurott": "samurott-hisui",
            "hisuian typhlosion": "typhlosion-hisui",
            "hisuian zoroark": "zoroark-hisui",
            "kommo-o": "kommoo",
            "lycanroc dusk form": "lycanroc-dusk",
            "lycanroc midnight form": "lycanroc-midnight",
            "palafin zero form": "palafin",
            "palafin hero form": "palafin-hero",
            "paldean tauros aqua breed": "tauros-paldeaaqua",
            "paldean tauros blaze breed": "tauros-paldeablaze",
            "paldean tauros combat breed": "tauros-paldeacombat",
            "vivillon fancy pattern": "vivillon"
        };

        if (showdownExceptions[cleanName]) return showdownExceptions[cleanName];

        return cleanName.replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
    };

    const showdownName = getShowdownName(displayName);

    const pokeApiName = displayName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-');

    const sources = [
        `https://play.pokemonshowdown.com/sprites/ani/${showdownName}.gif`,
        `https://play.pokemonshowdown.com/sprites/dex/${showdownName}.png`,
        `https://play.pokemonshowdown.com/sprites/gen5/${showdownName}.png`,
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokeApiName}.png`,
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png`
    ];

    return (
        <img
            src={sources[imgIndex]}
            alt={displayName}
            onError={() => {
                if (imgIndex < sources.length - 1) {
                    setImgIndex((prev) => prev + 1);
                }
            }}
            // If a className is passed, use it. Otherwise, fallback to the default grid styling.
            className={className || "max-h-16 max-w-full object-contain group-hover:scale-110 transition-transform duration-300"}
            style={{ imageRendering: imgIndex > 0 ? 'pixelated' : 'auto' }}
        />
    );
}