import React from 'react';
import {withStyles} from 'material-ui/styles';

import AppBar from 'material-ui/AppBar';
import Toolbar from 'material-ui/Toolbar';
import Typography from 'material-ui/Typography';

import {Drawer, IconButton, Menu, MenuItem, Select, Snackbar} from "material-ui";
import ArrowBackIcon from 'material-ui-icons/ArrowBack';
import MoreVertIcon from 'material-ui-icons/MoreVert';

import firebase from 'firebase';
import 'firebase/storage';

import DownloadSheetsDialog from "../components/dialogs/DownloadSheetsDialog";
import {FileDownload, Info, InfoOutline} from "material-ui-icons";

const styles = {
    root: {},

    instrumentSelector: {
        marginLeft: 25
    },

    flex: {
        flex: 1
    },

    sheetContainer: {
        paddingTop: 64
    },

    sheet: {
        width: '100%'
    },

    drawer__paper: {
        width: 250
    }
};

class Score extends React.Component {
    state = {
        fileUploaderOpen: false,
        selectedPartId: null,
        anchorEl: null,
        selectedPart: 0,
        score: {}
    };

    unsubs = [];

    _onInstrumentSelectChange(e) {
        this.setState({selectedPart: e.target.value});
    }

    _onArrowBackButtonClick = () => {
        window.location.hash = '';
    };

    _onMenuClose() {
        this.setState({anchorEl: null});
    }

    _onMoreVertClick(e) {
        this.setState({anchorEl: e.currentTarget});
    }

    async _onMenuClick(type) {
        this.setState({anchorEl: null});

        const user = firebase.auth().currentUser;

        switch (type) {
            case 'download':
                try {
                    const {selectedPart, score} = this.state;

                    const part = score.parts[selectedPart];

                    const {} = await this.downloadDialog.open(part.instrument);

                    const jsPDF = await import('jspdf');

                    const dateString = new Date().toLocaleDateString();

                    const {width, height} = await new Promise(resolve => {
                        const img = new Image();
                        img.onload = () => resolve(img);
                        img.src = part.pages[0].originalURL;
                    });

                    const doc = new jsPDF('p', 'px', [width, height]);

                    for (let i = 0; i < part.pages.length; i++) {
                        if (i > 0) {
                            doc.addPage();
                        }

                        const url = part.pages[0].originalURL;
                        const response = await fetch(url);
                        const blob = await response.blob();

                        const imageData = await new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result);
                            reader.onerror = reject;
                            reader.readAsDataURL(blob);
                        });

                        doc.addImage(imageData, 'PNG', 0, 0, width, height);
                        doc.text(`${dateString}     ${score.title}     Downloaded by: ${user.displayName}     Page: ${i + 1}/${part.pages.length}`, 20, height - 20);
                    }

                    doc.save(`${score.title}.pdf`);
                } catch (err) {
                    console.log(err);
                    // Cancelled
                }

                break;
        }
    }

    componentDidUpdate(prevProps, prevState) {
        const {page, detail} = this.props;

        if (page !== prevProps.page) {
            const [bandId, scoreId] = [detail.slice(0, 20), detail.slice(20)];

            const bandRef = firebase.firestore().doc(`bands/${bandId}`);

            const scoreDoc = bandRef.collection('scores').doc(scoreId);

            this.unsubs.forEach(unsub => unsub());

            this.unsubs.push(
                scoreDoc.onSnapshot(async snapshot => {
                    this.setState({score: {...this.state.score, ...snapshot.data(), id: snapshot.id}});
                })
            );

            this.unsubs.push(
                scoreDoc.collection('parts').onSnapshot(async snapshot => {
                    const parts = await Promise.all(
                        snapshot.docs.map(async doc => ({
                            ...doc.data(),
                            id: doc.id,
                            instrument: (await doc.data().instrumentRef.get()).data()
                        }))
                    );

                    const partsSorted = parts
                        .sort((a, b) => a.instrument.name.localeCompare(b.instrument.name));

                    this.setState({score: {...this.state.score, parts: partsSorted}});
                })
            );
        }
    }

    render() {
        const {classes} = this.props;
        const {anchorEl, message, selectedPart, score} = this.state;

        const hasParts = Boolean(score.parts && score.parts.length);

        return (
            <div className={classes.root}>
                <AppBar>
                    <Toolbar>
                        <IconButton color="inherit" onClick={() => this._onArrowBackButtonClick()}>
                            <ArrowBackIcon/>
                        </IconButton>
                        <Typography variant="title" color="inherit">
                            {score.title}
                        </Typography>
                        {
                            hasParts &&
                            <Select
                                className={classes.instrumentSelector}
                                value={selectedPart}
                                onChange={e => this._onInstrumentSelectChange(e)}
                                disableUnderline={true}
                            >
                                {
                                    score.parts.map((part, index) =>
                                        <MenuItem key={index}
                                                  value={index}>{part.instrument.name} {part.instrumentNumber > 0 ? part.instrumentNumber : ''}</MenuItem>
                                    )
                                }
                            </Select>
                        }
                        <div className={classes.flex}/>
                        <IconButton color='inherit' onClick={e => this._onMenuClick('download')}>
                            <FileDownload/>
                        </IconButton>
                        <IconButton color='inherit' onClick={e => this._onMenuClick('info')}>
                            <InfoOutline/>
                        </IconButton>
                    </Toolbar>
                </AppBar>
                <div className={classes.sheetContainer}>
                    {
                        hasParts &&
                        (score.parts[selectedPart].pages || []).map((page, index) =>
                            <img key={index} className={classes.sheet} src={page.originalURL}/>
                        )
                    }
                </div>
                <Drawer
                    anchor='right'
                    open={false}
                    classes={{paper: classes.drawer__paper}}
                >
                    lol
                </Drawer>
                <DownloadSheetsDialog onRef={ref => this.downloadDialog = ref}/>
                <Snackbar
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'left',
                    }}
                    open={Boolean(message)}
                    message={message}
                />
            </div>
        );
    }
}


export default withStyles(styles)(Score);