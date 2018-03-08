import React from 'react';

import {
    Button, Dialog, DialogActions, DialogContent, DialogTitle,
    FormControl, Input, InputLabel, List, ListItem, ListItemText, MenuItem, Select, Step, StepLabel, Stepper, TextField,
    Typography,
    withStyles
} from "material-ui";
import AsyncDialog from "./AsyncDialog";
import {Add} from "material-ui-icons";
import Selectable from "../Selectable";

const styles = {
    selectable: {
        width: '100%',
        height: 130,
        marginBottom: 15
    }
};


class AddCompletePDF extends React.Component {
    state = {
        pdfData: {},
        activeStep: 0,
        open: false,
        pdf: null,
        entered: false,
        selectedItems: new Set(),
        scoreCreated: false,
        scoreData: {}
    };

    componentDidMount() {
        this.props.onRef(this);
    }

    componentWillUnmount() {
        this.props.onRef(undefined)
    }

    async open(pdf) {
        return new Promise((resolve, reject) => {
            this.setState({open: true, pdf: pdf, scoreData: {title: pdf.name}});
            this.__resolve = resolve;
            this.__reject = reject;
        });
    }

    _onSelectChange(type, index, e) {
        const pdfData = {...this.state.pdfData};
        pdfData[index][type] = e.target.value;
        this.setState({pdfData: pdfData})
    }

    _onScoreClick(scoreId) {
        this.setState({scoreData: {id: scoreId}, activeStep: 2});
    }

    _onNewScoreClick = () => {
        this.setState({activeStep: 1});
    };

    _onNextClick = () => {
        const {activeStep, pdfData, scoreData, pdf, selectedItems} = this.state;
        const {band} = this.props;

        if (activeStep < 3) {
            this.setState({activeStep: activeStep + 1});
        }

        if (activeStep === 1) {
            this.setState({scoreCreated: true});
        }

        if (activeStep === 2) {
            this.setState({pdfData: Array.from(selectedItems).map(_ => ({instrument: 0, instrumentNumber: 0}))});
        }

        if (activeStep === 3) {
            // this.__resolve({
            //     score: scoreData,
            //     instruments: Object.keys(pdfData).map(i => ({
            //         pdfId: pdfs[i].id,
            //         instrumentId: band.instruments[pdfData[i].instrument].id,
            //         instrumentNumber: pdfData[i].instrumentNumber
            //     }))
            // });
            //
            // this.setState({
            //     open: false,
            //     activeStep: 0,
            //     scoreCreated: false,
            //     selectionData: {pdfData: pdfs.map(_ => ({instrument: 0, instrumentNumber: 0}))},
            //     scoreData: {}
            // });
        }
    };

    _onCancelClick = () => {
        this.__reject("Dialog canceled");
        this.setState({open: false});
    };

    _onBackClick = () => {
        const {activeStep, scoreCreated} = this.state;
        this.setState({activeStep: activeStep === 2 && !scoreCreated ? 0 : activeStep - 1});
    };

    _onDialogEntered = () => {
        this.setState({entered: true});
    };

    _onItemSelect = index => {
        const selectedItems = new Set(this.state.selectedItems);
        if (selectedItems.has(index)) {
            selectedItems.delete(index);
        } else {
            selectedItems.add(index);
        }
        this.setState({selectedItems: selectedItems});
    };

    _onScoreDataChange = (type, e) => {
        this.setState({scoreData: {...this.state.scoreData, [type]: e.target.value}});
    };

    render() {
        const {activeStep, open, pdf, entered, selectedItems, pdfData, scoreData, scoreCreated} = this.state;
        const {classes, band} = this.props;

        if (!open) return null;

        return <Dialog open={open} onEntered={this._onDialogEntered}>
            <DialogTitle>Create score</DialogTitle>
            <DialogContent style={{display: 'flex', flexDirection: 'column'}}>
                <Stepper activeStep={activeStep}>
                    <Step>
                        <StepLabel>Select score</StepLabel>
                    </Step>
                    <Step completed={scoreCreated}>
                        <StepLabel>Create new</StepLabel>
                    </Step>
                    <Step>
                        <StepLabel>Select split points</StepLabel>
                    </Step>
                    <Step >
                        <StepLabel>Select instruments</StepLabel>
                    </Step>
                </Stepper>
                <div style={{overflowY: 'auto', width: '100%', height: 500}}>
                    {
                        activeStep === 0 &&
                        <List>
                            <ListItem button onClick={this._onNewScoreClick}>
                                <Add/>
                                <ListItemText primary='New score'/>
                            </ListItem>
                            {
                                band.scores && band.scores.map((score, index) =>
                                    <ListItem key={index} button onClick={() => this._onScoreClick(score.id)}>
                                        <ListItemText primary={score.title}/>
                                    </ListItem>
                                )
                            }
                        </List>
                    }

                    {
                        activeStep === 1 && <div style={{display: 'flex', flexDirection: 'column'}}>
                            <TextField label='Title' style={{marginBottom: 20}} value={scoreData.title} onChange={e => this._onScoreDataChange('title', e)}/>
                            <TextField label='Composer' style={{marginBottom: 20}} onChange={e => this._onScoreDataChange('composer', e)}/>
                        </div>
                    }

                    {
                        activeStep === 2 && entered && pdf.pagesCropped.map((page, index) =>
                            <Selectable
                                selected={selectedItems.has(index)}
                                classes={{root: classes.selectable}}
                                key={index}
                                imageURL={page}
                                selectMode
                                onSelect={() => this._onItemSelect(index)}
                            />
                        )
                    }


                    {
                        activeStep === 3 && pdf.pagesCropped.filter((_, index) => selectedItems.has(index)).map((page, index) =>
                            <div key={index} style={{display: 'flex', alignItems: 'center', marginBottom: 20}}>
                                <div style={{width: 200, height: 150, overflow: 'hidden', marginRight: 20, border: '1px solid #E8E8E8'}}>
                                    <img width="300%" src={page}/>
                                </div>
                                <FormControl style={{marginRight: 20, width: 150}}>
                                    <InputLabel htmlFor="instrument">Instrument</InputLabel>
                                    <Select
                                        value={pdfData[index].instrument}
                                        onChange={e => this._onSelectChange('instrument', index, e)}
                                        inputProps={{id: 'instrument'}}
                                    >
                                        {
                                            band.instruments && band.instruments.map((instrument, index) =>
                                                <MenuItem key={index} value={index}>{instrument.name}</MenuItem>
                                            )
                                        }
                                    </Select>
                                </FormControl>
                                <FormControl style={{width: 70}}>
                                    <InputLabel htmlFor="number">Number</InputLabel>
                                    <Select
                                        value={pdfData[index].instrumentNumber}
                                        onChange={e => this._onSelectChange('instrumentNumber', index, e)}
                                    >
                                        <MenuItem value={0}>None</MenuItem>
                                        {[1, 2, 3, 4, 5].map(i => <MenuItem key={i} value={i}>{i}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </div>

                        )
                    }
                </div>
            </DialogContent>
            <DialogActions>
                <Button color="primary" onClick={this._onCancelClick}>Cancel</Button>
                <Button color="primary" onClick={this._onBackClick} disabled={activeStep === 0}>Back</Button>
                <Button color="primary" onClick={this._onNextClick} disabled={activeStep === 0 || (activeStep === 2 && selectedItems.size === 0)}>{activeStep === 3 ? 'Done' : 'Next'}</Button>
            </DialogActions>
        </Dialog>
    }
}


export default withStyles(styles)(AddCompletePDF);