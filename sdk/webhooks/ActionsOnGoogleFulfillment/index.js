/* eslint-disable max-len */
/**
 * Copyright 2021 Xavier Portilla Edo
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const {
  conversation,
  Card,
  Simple,
  Link,
  Image,
  Collection,
} = require('@assistant/conversation');
const functions = require('firebase-functions');
const axios = require('axios');

const pokeApiURL = 'https://pokeapi.co/api/v2/pokemon/';

/**
 * Gets the info of a pokemon from PokeAPI.
 * @param {string} pokemon the pokemon id.
 * @return {data} The sum of the two numbers.
 */
async function getPokemon(pokemon) {
  return await makeRequest(pokeApiURL + pokemon);
}

/**
 * Gets the specie of a pokemon from PokeAPI.
 * @param {string} pokemonId the pokemon id.
 * @return {data} The sum of the two numbers.
 */
async function getPokemonSpecie(pokemonId) {
  const p = await getPokemon(pokemonId);
  return await makeRequest(p.data.species.url);
}

/**
 * Gets the description of a pokemon from a list of descriptions in multiple languages.
 * @param {data} descriptions the pokemon descriptions.
 * @param {string} locale the locale of the user.
 * @return {string} The sum of the two numbers.
 */
function getPokemonDescription(descriptions, locale) {
  let descriptionString = '';

  for (let i = 0; i < descriptions.length; i++) {
    if (locale.indexOf(descriptions[i].language.name) !== -1) {
      descriptionString = descriptions[i].flavor_text;
    }
  }

  return descriptionString;
}

/**
 * Gets the types of a pokemon from PokeAPI.
 * @param {array} types the types of a pokemon.
 * @param {array} locale the pokemon id.
 * @return {string} The sum of the two numbers.
 */
async function getPokemonTypes(types, locale) {
  let typesResult = [];
  let k = 0;
  for (let i = 0; i < types.length; i++) {
    let type = types[i];
    let typeInfo = await makeRequest(type.type.url);

    for (let j = 0; j < typeInfo.data.names.length; j++) {
      let typeLocale = typeInfo.data.names[j];
      if (locale.indexOf(typeLocale.language.name) != -1) {
        typesResult[k] = typeLocale.name;
        k++;
      }
    }
  }

  return typesResult.join(', ');
}

/**
 * Makes a API request.
 * @param {string} url The url to fetch the data.
 * @return {data} The sum of the two numbers.
 */
async function makeRequest(url) {
  return await axios.get(url);
}

/**
 * Gets the types of a pokemon from PokeAPI.
 * @param {string} evolutionChainUrl the types of a pokemon.
 * @return {array} The sum of the two numbers.
 */
async function getPokemonEvolutions(evolutionChainUrl) {
  let evolutionChain = await makeRequest(evolutionChainUrl);
  return [].concat(
    ...getPokemonEvolution(evolutionChain.data.chain.evolves_to)
  );
}

/**
 * Gets the evolutions of a pokemon from PokeAPI.
 * @param {array} evolutions the types of a pokemon.
 * @return {array} The sum of the two numbers.
 */
function getPokemonEvolution(evolutions) {
  let result = [];
  for (let i = 0; i < evolutions.length; i++) {
    let evolution = evolutions[i].species.name;
    result.push(evolution);
    if (evolutions[i].evolves_to.length > 0) {
      result.push(getPokemonEvolution(evolutions[i].evolves_to));
    }
    // result += evolution + ' ' + getPokemonEvolution(evolutions[i].evolves_to);
  }
  return result;
}

/**
 * Capitalizes a string
 * @param {string} word The string to capitalize.
 * @return {string} The string capitalized.
 */
function capitalize(word) {
  return word[0].toUpperCase() + word.substring(1).toLowerCase();
}

const app = conversation({
  debug: true,
});

/**
 * Capitalizes a string
 * @param {string} conv The string to capitalize.
 * @param {string} specie The string to capitalize.
 * @param {string} pokemon The string to capitalize.
 * @param {string} pokemonIdString The string to capitalize.
 * @param {string} locale The string to capitalize.
 */
async function showInforForOnePokemon(
  conv,
  specie,
  pokemon,
  pokemonIdString,
  locale
) {
  let descriptionString = getPokemonDescription(
    specie.data.flavor_text_entries,
    locale
  );
  const types = await getPokemonTypes(pokemon.data.types, locale);

  const supportsRichResponse =
    conv.device.capabilities.includes('RICH_RESPONSE');

  if (supportsRichResponse) {
    conv.add(
      new Card({
        title: capitalize(pokemon.data.species.name),
        subtitle: types,
        text: capitalize(descriptionString),
        image: new Image({
          height: 500,
          width: 500,
          url:
            'https://assets.pokemon.com/assets/cms2/img/pokedex/full/' +
            pokemonIdString +
            '.png',
          alt: capitalize(pokemon.data.species.name),
        }),
        button: new Link({
          name: 'Más info',
          open: {
            url: 'https://www.pokemon.com/es/pokedex/' + pokemonIdString,
          },
        }),
      })
    );
  }

  console.log('Pokemon matched: ' + pokemon);

  conv.add(
    new Simple({
      speech: descriptionString,
      text: 'Información sobre ' + capitalize(pokemon.data.species.name),
    })
  );
}

// Option
app.handle('option', async (conv) => {
  const pokemon = conv.session.params.prompt_option.toLowerCase();
  const locale = conv.user.locale;

  const p = await getPokemon(pokemon);
  const pokemonId = p.data.id;
  const pokemonIdString = String(pokemonId).padStart(3, '0');

  const specie = await getPokemonSpecie(pokemonId);

  await showInforForOnePokemon(conv, specie, p, pokemonIdString, locale);
});

app.handle('GetEvolutionHandler', async (conv) => {
  const pokemon = conv.intent.params.pokemon.resolved;
  const pokemonOriginal = conv.intent.params.pokemon.original;
  console.log('Resolved ' + conv.intent.params.pokemon.resolved);
  console.log('Original ' + conv.intent.params.pokemon.original);
  const pokemonId = pokemon - 1;
  const locale = conv.user.locale;

  if (pokemon != pokemonOriginal) {
    const pokemonIdString = String(pokemonId).padStart(3, '0');
    // const locale = conv.user.locale;

    // const pokemonIdString = String(pokemonId).padStart(3, '0');
    const p = await getPokemon(pokemonId);

    const specie = await getPokemonSpecie(pokemonId);

    let evolutions = await getPokemonEvolutions(
      specie.data.evolution_chain.url
    );

    if (evolutions.length == 1) {
      const pEvolution = await getPokemon(evolutions[0]);

      const specieEvolution = await getPokemonSpecie(evolutions[0]);
      await showInforForOnePokemon(
        conv,
        specieEvolution,
        pEvolution,
        pokemonIdString,
        locale
      );
      conv.add(
        new Simple({
          speech:
            capitalize(p.data.species.name) +
            ' Solo tiene una evolucion: ' +
            capitalize(pEvolution.data.species.name),
          text: 'Información sobre ' + capitalize(pEvolution.data.species.name),
        })
      );
      return;
    } else if (evolutions.length > 1) {
      let evolutionsItems = [];
      let evolutionsKeys = [];

      for (let index = 0; index < evolutions.length; index++) {
        let element = evolutions[index];
        let pItem = await getPokemon(element);
        const pokemonIdStringItem = String(pItem.data.id).padStart(3, '0');
        const specieItem = await getPokemonSpecie(element);
        const descriptionStringItem = getPokemonDescription(
          specieItem.data.flavor_text_entries,
          locale
        );

        evolutionsItems[index] = {
          name: element,
          synonyms: ['Item ' + index, element],
          display: {
            title: capitalize(element),
            description: descriptionStringItem,
            image: new Image({
              url:
                'https://assets.pokemon.com/assets/cms2/img/pokedex/full/' +
                pokemonIdStringItem +
                '.png',
              alt: capitalize(element),
            }),
          },
        };
        evolutionsKeys[index] = {
          key: element,
        };
      }

      conv.session.typeOverrides = [
        {
          name: 'prompt_option',
          mode: 'TYPE_REPLACE',
          synonym: {
            entries: evolutionsItems,
          },
        },
      ];

      // Define prompt content using keys
      conv.add(
        new Collection({
          title: 'Evoluciones',
          subtitle: 'Collection subtitle',
          items: evolutionsKeys,
        })
      );
    } else {
      conv.add(
        new Simple({
          speech: 'Este pokemon no tiene evoluciones',
          text: 'Información sobre ' + capitalize(p.data.species.name),
        })
      );
      await showInforForOnePokemon(conv, specie, p, pokemonIdString, locale);
      return;
    }

    conv.add(
      new Simple({
        speech: 'Las evoluciones son ' + evolutions.join(', '),
        text: 'Información sobre ' + capitalize(p.data.species.name),
      })
    );
  } else {
    conv.add(
      new Simple({
        speech: 'Perdona, no te he entendido, ¿Puedes volver a intentarlo?',
        text: 'Perdona, no te he entendido, ¿Puedes volver a intentarlo?',
      })
    );
  }

  conv.overwrite = true;
});

app.handle('GetInfoHandler', async (conv) => {
  const pokemon = conv.intent.params.pokemon.resolved;
  const pokemonOriginal = conv.intent.params.pokemon.original;

  const pokemonId = pokemon - 1;
  const locale = conv.user.locale;
  if (pokemon != pokemonOriginal) {
    const pokemonIdString = String(pokemonId).padStart(3, '0');

    const p = await getPokemon(pokemonId);

    const specie = await getPokemonSpecie(pokemonId);

    await showInforForOnePokemon(conv, specie, p, pokemonIdString, locale);
  } else {
    conv.add(
      new Simple({
        speech: 'Perdona, no te he entendido, ¿Puedes volver a intentarlo?',
        text: 'Perdona, no te he entendido, ¿Puedes volver a intentarlo?',
      })
    );
  }

  conv.overwrite = true;
});

exports.ActionsOnGoogleFulfillment = functions.https.onRequest(app);
