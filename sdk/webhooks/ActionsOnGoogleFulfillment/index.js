/* eslint-disable max-len */
/**
 * Copyright 2020 Xavier Portilla Edo
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

 const {conversation, Card, Simple, Link, Image} = require('@assistant/conversation');
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
  * Gets the types of a pokemon from PokeAPI.
  * @param {array} pokemon the pokemon id.
  * @param {array} locale the pokemon id.
  * @return {string} The sum of the two numbers.
  */
 async function getPokemonTypes(types, locale) {
   let typesResult = [];
   let k=0;
   for (let i = 0; i < types.length; i++) {
     let type = types[i];
     let typeInfo = await makeRequest(type.type.url)
 
     for (let j = 0; j < typeInfo.data.names.length; j++) {
       let typeLocale = typeInfo.data.names[j];
       if(locale.indexOf(typeLocale.language.name) != -1){
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
  * Capitalizes a string
  * @param {string} word The string to capitalize.
  * @return {string} The string capitalized.
  */
 function capitalize(word) {
   return word[0].toUpperCase() + word.substring(1).toLowerCase();
 }
 
 const app = conversation({debug: true});


 app.handle('GetEvolutionHandler', async (conv) => {

  conv.overwrite = true;
});
 
 app.handle('GetInfoHandler', async (conv) => {
   const pokemon = conv.intent.params.pokemon.resolved;
   const pokemonId = pokemon - 1;
   const locale = conv.user.locale;
 
   const pokemonIdString = String(pokemonId).padStart(3, '0')
 
   const p = await getPokemon(pokemonId);
 
   const types = await getPokemonTypes(p.data.types, locale);
 
   const specie = await makeRequest(p.data.species.url);
 
   let descriptions = specie.data.flavor_text_entries;
 
   let descriptionString = '';
 
   for (let i = 0; i < descriptions.length; i++) {
       if (locale.indexOf(descriptions[i].language.name) !== -1) {
           descriptionString = descriptions[i].flavor_text;
       }
   }
 
   const supportsRichResponse = conv.device.capabilities.includes('RICH_RESPONSE');
 
 if (supportsRichResponse) {
     conv.add(new Card({
       title: capitalize(p.data.species.name),
       subtitle: types,
       text: capitalize(descriptionString),
       image: new Image({
         height: 500,
         width: 500,
         url: 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/'+pokemonIdString+'.png',
         alt: capitalize(p.data.species.name),
       }),
       button: new Link({
         name: 'Más info',
         open: {
           url: 'https://www.pokemon.com/es/pokedex/'+pokemonIdString,
         },
       }),
     }));
   }
 
   console.log('Pokemon matched: ' + pokemon);
 
   conv.add(new Simple({
    speech: descriptionString,
    text: 'Información sobre '+capitalize(p.data.species.name),
   }));

   conv.overwrite = true;
 });
 
 exports.ActionsOnGoogleFulfillment = functions.https.onRequest(app);
 