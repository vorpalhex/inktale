import storyContent from './story.js';
import * as utils from './utils.js';
import * as tags from './tags.js';
import * as dataManager from './dataManager.js';
import * as ui from './ui.js';

const storyContainer = document.querySelector('#story');
const outerScrollContainer = document.querySelector('.scrollWrapper');
let story;

function init() {
  story = new inkjs.Story(storyContent);
  const tagResults = tags.parse(story.globalTags || []);
  let firstTime = true;
  if (tagResults.title) {
    //having a title means we can enable saves!
    const hasAutoSave = dataManager.init(tagResults.title);
    dataManager.setStoryRef(story);
    if (hasAutoSave) {
      dataManager.load();
      const data = dataManager.getData();
      story.state.LoadJson(data.state);
      firstTime = false;
      const paragraphElement = document.createElement('p');
      paragraphElement.innerText = '<save automatically loaded>';
      addElements([paragraphElement]);
    }
  }
  ui.init();
  // Kick off the start of the story!
  continueStory(firstTime);
}

// Main story processing function. Each time this is called it generates
// all the next content up as far as the next set of choices.
function continueStory(firstTime) {
  // Don't over-scroll past new content
  const previousBottomEdge = firstTime
    ? 0
    : utils.contentBottomEdgeY(storyContainer);

  let elemsToCreate = [];
  // Generate story text - loop through available content
  while (story.canContinue) {
    // Get ink to generate the next paragraph
    const paragraphText = story.Continue();
    const tagResults = tags.parse(story.currentTags);
    //create elements
    if (tagResults.restart) {
      return restart();
    }

    // Create paragraph element (initially hidden)
    const paragraphElement = document.createElement('p');

    paragraphElement.innerText = paragraphText;
    tagResults.classesToAdd.forEach(customClass =>
      paragraphElement.classList.add(customClass)
    );

    elemsToCreate.push(paragraphElement);
    elemsToCreate = elemsToCreate.concat(tagResults.elementsToInsert);
  }

  if (story.currentChoices.length) {
    //create a choice container
    const choiceContainer = document.createElement('div');
    choiceContainer.classList.add('choiceContainer');
    elemsToCreate.push(choiceContainer);

    // Create HTML choices from ink choices
    story.currentChoices.forEach(function(choice) {
      // Create paragraph with anchor element
      const choiceParagraphElement = document.createElement('p');
      choiceParagraphElement.classList.add('choiceWrapper');
      choiceParagraphElement.innerHTML = `<a class="choice" href='#'>${choice.text}</a>`;
      choiceContainer.appendChild(choiceParagraphElement);

      choiceParagraphElement.addEventListener(
        'click',
        choiceHandler.bind(this, choice)
      );
    });
  }

  // Extend height to fit
  // We do this manually so that removing elements and creating new ones doesn't
  // cause the height (and therefore scroll) to jump backwards temporarily.
  storyContainer.style.height = utils.contentBottomEdgeY(storyContainer) + 'px';
  addElements(elemsToCreate);
  if (!firstTime) {
    utils.scrollDown(previousBottomEdge, outerScrollContainer);
  }
}

function restart() {
  story.ResetState();
  utils.setVisible('.header', true, storyContainer);
  continueStory(true);
  outerScrollContainer.scrollTo(0, 0);
}

function choiceHandler(choice, e) {
  e.preventDefault();
  utils.removeAll('div.choiceContainer', storyContainer);
  story.ChooseChoiceIndex(choice.index);
  continueStory();
}

function addElements(elems) {
  let delay = 0;
  dataManager.getPref('delay');

  const itemDelay = 200; //@TODO update to be a dynamic pref
  elems.forEach(elem => {
    elem.classList.add('scene');
    storyContainer.appendChild(elem);
    delay = delay + itemDelay;
    utils.showAfter(delay, elem);
  });

  return delay;
}

document.addEventListener('keydown', event => {
  if (event.isComposing) return;
  if (event.keyCode === 32) {
    utils.showAllNow();
  }
});

init();
