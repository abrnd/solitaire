import * as React from 'react';
import styled from 'styled-components';

import {
  DndContext,
  closestCorners,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable
} from "@dnd-kit/core";

import {CSS} from '@dnd-kit/utilities';


import { produce } from 'immer';

const StyledCard = styled.div`
  height: ${props => props.isSmall ? "1.5em" : "8em"};
  width: 6em;
  background: ${props => props.suits%2 == 0 ? "#333333" :  "#ff4d4d"};
  margin: ${props => props.isGoal ? "6px 6px 6px 2em" : "6px"};
  visibility: ${props => props.isVisible ? "visible" : "hidden"};
`;

const StyledFlippedDraw = styled.div`
  height: 8em;
  width: 6em;
  background: #ffffb3;
  margin: 6px;
`

const StyledFlippedCard = styled.div`
  height: 1.5em;
  width: 6em;
  background: #ffffb3;
  margin: 6px;
`

const StyledUpperDiv = styled.div`
  display: flex;
  flex-direction: row;
`

const StyledGame = styled.div`
  display: flex;
  flex-direction: column;
  background: #1e7b1e;
  width: 75em;
  height: 50em;
`

const StyledDraw = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
`

const StyledEmptyZone = styled.div`
  border: solid;
  width: 6em;
  height: 8em;
  margin-left: 2em;
`

const StyledGoal = styled.div`
  border: solid;
  width: 37em;
  height: 97%;
  display: inline-flex;
`

const StyledLineBoard = styled.div`
  width: 6.5em;
  margin-right: 0.9em;
`

const StyledBoard = styled.div`
  margin-top: 0.5em;
  display: inline-flex;
`

//victory
//Style

const App = () => {

  const gameInit = initGame();

  const [game, setGame] = React.useState(gameInit);
  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor));


  const handleDrawClick = (e) => {

    const nextDraw = produce(game, draft => {
      const shiftedCard = draft.draw.shift();
      draft.draw.push(shiftedCard);
    })
    
    setGame(nextDraw);
  }

  const handleDragMove = (e) => {
    const {active} = e;
    const index = active.data.current.index;

    //hide cards
    if(index.charAt(0) === 'b'){
      const nextLine = produce(game, draft => {

        const lineIndex = index.slice(1);
        
        const lengthStart = draft.board[lineIndex].length;
        const pos = active.data.current.pos;

        if(lengthStart > 1 && (pos != (lengthStart -1))){
          draft.board[lineIndex].map( (val, i) => {
            if(i < (pos +1)){
              return;
            } else {
              val.isVisible = false;
            }
          });
        }
      })

      setGame(nextLine);
    }
  }


  const handleDragEnd = (e) => {
    const {active, over} = e;
    const action_drop = over.id.replace(/[^a-zA-Z]+/g, '');
    const indexLineDrop = parseInt(over.id.replace('LineBoard-', ''));


    //unhide cards
    const changeVisibility = produce(game, draft => {
      const index = active.data.current.index;
      //start
      if(index.charAt(0) === 'b'){
        const indexLineStart = index.slice(1);
        draft.board[indexLineStart].map((val, i) => {
          val.isVisible = true;
        })
        
      }

      //destination
      if(!isNaN(indexLineDrop)){
        draft.board[indexLineDrop].map( (val, i) => {
          val.isVisible = true;
        })
      }
    });
    setGame(changeVisibility);

    //rules & mouvements
    switch (action_drop ){
      case 'goal' :

        const goalIndex = parseInt(over.id.replace('goal-', ''));
        let continueProcess_goal = true;
    
        const nextGoal = produce(game, draft => {

          const index = active.data.current.index;
          const previousCard = (draft.goal[goalIndex].length != 0) ? draft.goal[goalIndex].slice().pop() : null;


          if(index.charAt(0) === 'b'){

            //board to goal
            const lineIndex = index.slice(1);
            const movingCard = draft.board[lineIndex].pop();

            continueProcess_goal = goalRules(movingCard, previousCard);
            draft.goal[goalIndex].push(movingCard);  
            const flippedBoardAtIndex = draft.flippedBoard[lineIndex];
            if(draft.board[lineIndex].length === 0 && flippedBoardAtIndex.length > 0){
              const unflipped_card = flippedBoardAtIndex.pop();
              draft.board[lineIndex].push(unflipped_card);
            }
          } else if(index.charAt(0) === 'g'){

            //goal to goal
            const goalStartIndex = index.slice(1);
            const movingCard = draft.goal[goalStartIndex].pop();
            draft.goal[goalIndex].push(movingCard);
            
            if(movingCard.val != 0) continueProcess_goal = false;
            //only aces
          } else if(index.charAt(0) === 'd'){

            //draw to goal
            const movingCard = draft.draw.shift();
            draft.goal[goalIndex].push(movingCard);
            continueProcess_goal = goalRules(movingCard, previousCard);
          }


        });
        
        if(continueProcess_goal) setGame(nextGoal);
        break;

      case 'LineBoard' : 

        const index = active.data.current.index;
        const lineDrop = parseInt(over.id.replace('LineBoard-', ''));
        let continueProcess_line = true;
        
        const nextLine = produce(game, draft => {

          const previousCard = (draft.board[lineDrop].length != 0) ? draft.board[lineDrop].slice().pop() : null;

          if(index.charAt(0) === 'b'){
            
            //board to board
            const lineDrag = parseInt(index.slice(1));
            const pos = active.data.current.pos;
            const line_length = draft.board[lineDrag].length;

            if(pos + 1 === line_length){

              //one card moving 
              const movingCard = draft.board[lineDrag].pop();

              draft.board[lineDrop].push(movingCard);
              continueProcess_line = boardLineRules(movingCard, previousCard);
            } else {

              //multiples cards moving
              const movingCards = draft.board[lineDrag].slice(pos);
              const restingCards = draft.board[lineDrag].slice(0, pos);
              const replace = draft.board[lineDrop].concat(movingCards);

              draft.board[lineDrop] = replace;
              draft.board[lineDrag] = restingCards;

              continueProcess_line = boardLineRules(movingCards[0], previousCard);
            }


  
            //repetition ??
            const flippedBoardAtIndex = draft.flippedBoard[lineDrag];
            if( draft.board[lineDrag].length ===0 && flippedBoardAtIndex.length > 0){
              const unflipped_card = flippedBoardAtIndex.pop();
              draft.board[lineDrag].push(unflipped_card);
            }
          } else if (index.charAt(0) === 'g'){

            //goal to board
            const goalIndex = parseInt(index.slice(1));
            const movingCard = draft.goal[goalIndex].pop();

            draft.board[lineDrop].push(movingCard);
            continueProcess_line = boardLineRules(movingCard, previousCard);
          } else if (index.charAt(0) === 'd'){

            //draw to board
            const movingCard = draft.draw.shift();

            draft.board[lineDrop].push(movingCard);
            continueProcess_line = boardLineRules(movingCard, previousCard);
          }

        });
      
        if(continueProcess_line) setGame(nextLine);
        break;
      default :
        throw new Error(`unknow action type ${action_drop}`);
    }

  }

  const draw = game.draw;
  const board = game.board;
  const flipped_board = game.flippedBoard
  const goal = game.goal;

  return(
    <DndContext
      autoScroll={false}
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
      onDragMove={handleDragMove}
    >
      <StyledGame>
        <h1>Klondire</h1>
        <StyledUpperDiv>
          <Draw draw={draw} onDrawClick={handleDrawClick} />
          <Goal goal={goal} />
        </StyledUpperDiv>
        <Board board={board} flippedBoard={flipped_board}/>
      </StyledGame>
    </DndContext>
  );
}

const Goal = ({goal}) => {

  return (
    <StyledGoal>
      {goal.map( (cards, index) => (
          <GoalCard key={index} index={index} cards={cards}/>
      ))}
    </StyledGoal>
  )
}

//Droppable

const GoalCard = ({cards, index}) => {
  const idS = 'goal-' + index;

  const {isOver, setNodeRef} = useDroppable({
    id: idS,
  });
  const style = {
    opacity: isOver ? 1 : 0.5,
  };
  
  const renderedCardData = (cards.length == 0) ? null : cards.slice(-1).pop() ;
  const renderedCard = (renderedCardData === null) ?  <StyledEmptyZone /> : <Card id={renderedCardData.id} index={'g' + index} suits={renderedCardData.suits} value={renderedCardData.val} isGoal={'true'}/>

  return(
    <div ref={setNodeRef} style={style}>
      {renderedCard}
    </div>    
  );
}

const Draw = ({draw, onDrawClick}) => {

  let renderedCard;
  if(!(draw.length === 0)){
    const card = draw[0];
    renderedCard = <Card index={'d'} id={card.id} value={card.val} suits={card.suits} />
  } else {
    renderedCard = <StyledEmptyZone />
  }
  
  return(
    <StyledDraw>
      <StyledFlippedDraw onClick={onDrawClick} />
      {renderedCard}
    </StyledDraw>
  );
}

//Draggable
const Card = ({index, id, value, suits, pos=null, isSmall=false, isGoal = false, isVisible=true}) => {

  const data = (pos === null) ? {index: index} : {index: index, pos : pos}

  const {attributes, listeners, setNodeRef, transform} = useDraggable({
    id: id,
    data: data,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  }


  const symbol = getSuit(suits);
  const true_val = getTrueCardValue(value);

  return( 
    <StyledCard ref={setNodeRef} style={style} {...listeners} {...attributes} suits={suits} isSmall={isSmall} isVisible={isVisible} isGoal={isGoal} ><span>{true_val} {symbol}</span></StyledCard>
  );
}

const Board = ({board, flippedBoard}) => {

  return(
    <StyledBoard >
      {board.map( (cards, index) => (
          <LineBoard key={index} index={index} cards={cards} flippedCards={flippedBoard[index]} />
      ))}
    </StyledBoard>
  )
};

//droppable
const LineBoard = ({index, cards, flippedCards}) => {

  const idS = 'LineBoard-' + index;

  const {setNodeRef} = useDroppable({
    id: idS,
  });

  return(
    <StyledLineBoard ref={setNodeRef}>
      {flippedCards.map( (card) => {
        return <StyledFlippedCard key={card.id} />
      })}
      {cards.map( (card, pos) => {
        const isSmall = ((pos +1) === cards.length) ? false : true;
        return <Card key={card.id} id={card.id} index={'b' + index} value={card.val} suits={card.suits} pos={pos} isSmall={isSmall} isVisible={card.isVisible}></Card> 
      })}
    </StyledLineBoard>
  )
}


/* Init et fonction */

function goalRules(movingCard, previousCard){
  let continueProcess;
  if(previousCard == null && movingCard.val === 0){
    continueProcess = true;
  }
  else if(previousCard && (previousCard.suits === movingCard.suits) && ((previousCard.val + 1) === movingCard.val)){
    continueProcess = true;
  } else {
    continueProcess = false;
  }

  return continueProcess;
}

function boardLineRules(movingCard, previousCard){
  let continueProcess;

  if(previousCard == null && movingCard.val === 12){
    continueProcess = true;
  }
  else if(previousCard && movingCard.suits%2 != previousCard.suits%2 && (movingCard.val + 1) === previousCard.val){
    continueProcess = true;
  } else {
    continueProcess = false;
  }

  return continueProcess;
  
}

function initGame(){
  const game = {
    goal: [[], [], [], []],
    draw: [],
    board: [],
    flippedBoard: []
  };

  const cards = generateCards();

  //24 cards in draw
  const draw = cards.slice(0, 24);
  const incomplete_board = [];


  while(incomplete_board.length < 28){
    const randomIndex = getRandomInt(cards.length);

    if(!draw.includes(cards[randomIndex]) && !incomplete_board.includes(cards[randomIndex])){
      incomplete_board.push(cards[randomIndex]);
    }
  }

  const board = distribuate_board(incomplete_board);

  game.draw = draw;
  game.board = board.visible;
  game.flippedBoard = board.flipped;
  

  return game
}

function distribuate_board(board){
  //not beautiful but functional

  if(board.length != 28){
    throw 'error: there is not 28 card in board';
  }


  const b1 = [], b2= [], b3 = [], b4 = [], b5 = [], b6 = [], b7 = [];

  for(let i = 0; i < 28; i++){
    if(i == 0) b1.push(board[i]);
    if(i == 1 || i == 2) b2.push(board[i]); 
    if(i >= 3 && i <=5) b3.push(board[i]);
    if(i >=6 && i <= 9) b4.push(board[i]);
    if(i >= 10 && i <=14) b5.push(board[i]);
    if(i >= 15 && i <= 20) b6.push(board[i]);
    if( i >= 21) b7.push(board[i]);
  }

  const flipped_board = [];
  const visible_board = [];

  visible_board.push([b1.pop()]);
  visible_board.push([b2.pop()]);
  visible_board.push([b3.pop()]);
  visible_board.push([b4.pop()]);
  visible_board.push([b5.pop()]);
  visible_board.push([b6.pop()]);
  visible_board.push([b7.pop()]);
  
  flipped_board.push(b1);
  flipped_board.push(b2);
  flipped_board.push(b3);
  flipped_board.push(b4);
  flipped_board.push(b5);
  flipped_board.push(b6);
  flipped_board.push(b7);


  const organised_board = {};
  organised_board.visible = visible_board;
  organised_board.flipped = flipped_board;

  return organised_board;
}

function shuffle(array) {
  let currentIndex = array.length,  randomIndex;

  // While there remain elements to shuffle
  while (currentIndex != 0) {

    // Pick a remaining element
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function generateCards(){
    const cards = [];
    //dnd kit bug if id = 0;
    let c = 1;
    for(let i=0; i<4; i++){
        for(let y=0; y< 13; y++){
            cards.push({suits: i, val: y, id: c, isVisible: true})
            c++;
        }
    }

    shuffle(cards);

    return cards;
}

function getSuit(suits){
  let suit;
  switch(suits) {
    case 0 :
      suit = "♠";
      break;
    case 1 :
      suit = "♥";
      break;
    case 2 :
      suit = "♣";
      break;
    case 3 :
      suit = "♦";
      break;
     default :
      throw new Error('incorrect suits values'); 
  }

  return suit;
}

function getTrueCardValue(val){
  let true_val;
  if(val < 10){
    true_val = val + 1;
  } else if(val === 10){
    true_val = "J"
  } else if(val === 11){
    true_val = "Q"
  } else if (val === 12){
    true_val = "K"
  }

  return true_val;
}

export default App;
